#!/usr/bin/env python3
import argparse
import os
import sys
import tempfile
import shutil
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient

from api import (
    load_credentials,
    get_access_token,
    fetch_samples,
    fetch_group,
    validate_groups,
    authenticate_mimosa_user,
)
from upload import upload_similarity
from process_similarity import process_similarity
from MIMOSA import mimosa

from mimosa_state import (
    GLOBAL_PROFILE,
    init_pipeline_state,
    render_pipeline_state,
    render_runtime_summary,
    set_profile_mode,
)
from mimosa_runner import run_stage
from constants import AVAILABLE_PROFILES

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Process sample data, run ReporTree, and upload results to MIMOSA."
    )

    parser.add_argument("--credentials", required=False, default=None)
    parser.add_argument("--profile", required=False, nargs="+", default=None)
    parser.add_argument("--groups", required=False, nargs="+", default=None)
    parser.add_argument("--output", required=False)
    parser.add_argument("--save_files", action="store_true")
    parser.add_argument("--supplementary_metadata", required=False, default=None)

    parser.add_argument("--update-only", action="store_true")
    parser.add_argument("--run-similarity", action="store_true")
    parser.add_argument(
        "--re-cluster",
        action="store_true",
        help="Force clustering even if no new samples are detected.",
    )
    parser.add_argument("--debug", action="store_true")

    args = parser.parse_args()

    if args.save_files and not args.output:
        parser.error("--save_files requires --output")

    if args.profile is None and args.groups is None:
        target_profiles = AVAILABLE_PROFILES
    elif args.profile is None:
        target_profiles = AVAILABLE_PROFILES
    elif "All" in args.profile:
        target_profiles = AVAILABLE_PROFILES
    else:
        target_profiles = [p for p in args.profile if p in AVAILABLE_PROFILES]

    if not target_profiles:
        raise SystemExit("No valid profiles selected.")

    return args, target_profiles


def get_analyzed_sample_ids():
    """
    Fetch IDs of samples already analyzed in MIMOSA (from features collection).
    """
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set.")

    db_name = os.getenv("MONGO_DB_NAME")
    client = MongoClient(mongo_uri)
    db = client[db_name]

    feature_ids = set(db["features"].distinct("properties.ID"))

    client.close()
    return feature_ids


def decide_clustering(profile, new_ids, args, is_interactive):
    """
    Decide whether to run clustering for a profile.
    """
    if new_ids:
        print(f"[{profile}] New samples detected → clustering will run")
        return True

    if args.re_cluster:
        print(f"[{profile}] --re-cluster set → clustering will run")
        return True

    if is_interactive:
        user_input = (
            input(f"No new samples for {profile}. Re-run clustering? (yes/no): ")
            .strip()
            .lower()
        )
        return user_input in ("yes", "y")

    return False


def main():
    args, target_profiles = parse_args()

    credentials = load_credentials(args.credentials)
    token = get_access_token(credentials)

    if args.groups:
        try:
            validate_groups(credentials["bonsai_api_url"], token, args.groups)
        except ValueError as e:
            raise SystemExit(f"Error: {e}\nPlease check the group IDs and try again.")

    upload_token = authenticate_mimosa_user(credentials)

    display_mode = "update" if args.update_only else "full"

    base_dir = (
        args.output if args.save_files else tempfile.mkdtemp(prefix="mimosa_tmp_")
    )
    if args.save_files:
        os.makedirs(base_dir, exist_ok=True)

    all_ids_for_similarity = set()
    clustering_failed_profiles = set()
    is_interactive = sys.stdin.isatty()

    try:
        all_samples = fetch_samples(credentials["bonsai_api_url"], token)
        analyzed_ids = get_analyzed_sample_ids()

        group_sample_ids = None
        if args.groups:
            group_sample_ids = set()
            for gid in args.groups:
                group_sample_ids.update(
                    fetch_group(credentials["bonsai_api_url"], token, gid)
                )

        filtered_scope = {}
        for profile in target_profiles:
            profile_samples = [s for s in all_samples if s.get("profile") == profile]
            all_ids = {s["sample_id"] for s in profile_samples if "sample_id" in s}

            if group_sample_ids is not None:
                all_ids = all_ids & group_sample_ids

            if all_ids:
                filtered_scope[profile] = all_ids

        if filtered_scope:
            state_profiles = list(filtered_scope.keys())
            if args.run_similarity:
                state_profiles.append(GLOBAL_PROFILE)

            pipeline_state = init_pipeline_state(state_profiles, mode=display_mode)

            for profile in state_profiles:
                if profile != GLOBAL_PROFILE and profile in filtered_scope:
                    pipeline_state[profile]["fetch_samples"]["count"] = len(
                        filtered_scope[profile]
                    )

            render_pipeline_state(pipeline_state)
        else:
            print("No samples found matching the specified filters.")
            return

        for profile, all_ids in filtered_scope.items():

            new_ids = all_ids - analyzed_ids
            existing_ids = all_ids & analyzed_ids

            profile_dir = os.path.join(base_dir, profile)

            if args.update_only:
                print(f"[{profile}] Update-only mode: metadata sync only")

                try:
                    mimosa(
                        profile,
                        profile_dir,
                        args,
                        credentials,
                        token,
                        existing_ids,
                        upload_token,
                        pipeline_state,
                        run_clustering=False,
                    )
                    all_ids_for_similarity.update(existing_ids)
                except Exception as e:
                    print(f"[{profile}] ERROR in update-only mode: {e}")
                    clustering_failed_profiles.add(profile)

                continue

            run_clustering = decide_clustering(profile, new_ids, args, is_interactive)

            if not run_clustering:
                set_profile_mode(pipeline_state, profile, "update")
                render_pipeline_state(pipeline_state)

            if run_clustering:
                target_ids = all_ids
            else:
                target_ids = existing_ids

            try:
                did_cluster = mimosa(
                    profile,
                    profile_dir,
                    args,
                    credentials,
                    token,
                    target_ids,
                    upload_token,
                    pipeline_state,
                    run_clustering=run_clustering,
                )
            except Exception as e:
                print(f"\n[{profile}] *** CLUSTERING FAILED ***")
                print(f"[{profile}] Error: {e}")
                print(f"[{profile}] Metadata sync will still proceed")
                clustering_failed_profiles.add(profile)

                try:
                    print(
                        f"[{profile}] Attempting metadata sync for {len(existing_ids)} existing samples..."
                    )
                    mimosa(
                        profile,
                        profile_dir,
                        args,
                        credentials,
                        token,
                        existing_ids,
                        upload_token,
                        pipeline_state,
                        run_clustering=False,
                    )
                except Exception as metadata_error:
                    print(f"[{profile}] Metadata sync also failed: {metadata_error}")

            all_ids_for_similarity.update(all_ids)

        if args.run_similarity and all_ids_for_similarity:
            print("\n" + "=" * 70)
            print("Running similarity analysis...")
            print("=" * 70)

            if clustering_failed_profiles:
                print(
                    f"\n⚠️  WARNING: Clustering failed for profiles: {', '.join(sorted(clustering_failed_profiles))}"
                )
                print("Similarity will run on available data.\n")

            try:
                run_stage(
                    pipeline_state,
                    GLOBAL_PROFILE,
                    "run_similarity",
                    process_similarity,
                    credentials["bonsai_api_url"],
                    token,
                    sorted(all_ids_for_similarity),
                    base_dir,
                    save_files=True,
                )

                similarity_path = os.path.join(base_dir, "similarity.json")

                run_stage(
                    pipeline_state,
                    GLOBAL_PROFILE,
                    "upload_similarity",
                    upload_similarity,
                    similarity_path,
                    upload_token=upload_token,
                    count=len(all_ids_for_similarity),
                )
            except Exception as e:
                print(f"Similarity analysis failed: {e}")

        if clustering_failed_profiles:
            print(
                f"Clustering failed for: {', '.join(sorted(clustering_failed_profiles))}"
            )
            print("Metadata was updated where possible.")

    finally:
        if not args.save_files and os.path.exists(base_dir):
            shutil.rmtree(base_dir, ignore_errors=True)

    render_runtime_summary(pipeline_state)


if __name__ == "__main__":
    main()
