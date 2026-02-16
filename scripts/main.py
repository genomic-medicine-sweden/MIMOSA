#!/usr/bin/env python3
import argparse
import os
import tempfile
import shutil
from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient

from api import (
    load_credentials,
    get_access_token,
    fetch_samples,
    authenticate_mimosa_user,
)
from upload import upload_similarity
from sample_checks import get_new_sample_ids, prompt_if_no_new_samples
from process_similarity import process_similarity
from MIMOSA import mimosa

from mimosa_state import (
    init_pipeline_state,
    Status,
    render_pipeline_state,
    render_runtime_summary,
)
from mimosa_runner import run_stage

dotenv_path = find_dotenv(filename=".env", usecwd=True)
if not dotenv_path:
    raise FileNotFoundError("Could not find project-root .env file.")
load_dotenv(dotenv_path)

AVAILABLE_PROFILES = [
    "staphylococcus_aureus",
    "klebsiella_pneumoniae",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Process sample data, run ReporTree, and upload results to MIMOSA."
    )
    parser.add_argument(
            "--credentials",
            required=True,
            help="Path to credentials file."
            )
    parser.add_argument(
        "--profile",
        required=True,
        nargs="+",
        help="Target profile(s) to process. Pass 'All' to process all.",
    )
    parser.add_argument(
            "--output",
            required=False,
            help="Directory for output files."
            )
    parser.add_argument(
        "--supplementary_metadata",
        required=False,
        help="Path to supplementary metadata.",
    )
    parser.add_argument(
            "--save_files",
            action="store_true",
            help="Save output files locally."
            )
    parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing samples."
            )
    parser.add_argument(
            "--debug",
            action="store_true",
            help="Print full traceback."
            )
    parser.add_argument(
        "--skip_similarity",
        action="store_true",
        help="Skip similarity and related uploads",
    )

    args = parser.parse_args()

    if args.save_files and not args.output:
        parser.error("--save_files requires --output")

    if "All" in args.profile:
        target_profiles = AVAILABLE_PROFILES
    else:
        target_profiles = [p for p in args.profile if p in AVAILABLE_PROFILES]

    if not target_profiles:
        raise SystemExit("No valid profiles selected. Exiting.")

    return args, target_profiles


def get_analyzed_sample_ids():
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGO_URI_DOCKER")
    db_name = os.getenv("MONGO_DB_NAME")
    client = MongoClient(mongo_uri)
    db = client[db_name]

    similarity_ids = set(db["similarities"].distinct("ID"))
    feature_ids = set(db["features"].distinct("properties.ID"))

    client.close()
    return similarity_ids | feature_ids


def main():
    args, target_profiles = parse_args()

    GLOBAL_PROFILE = "__global__"
    pipeline_state = init_pipeline_state(target_profiles + [GLOBAL_PROFILE])

    for stage in (
        "prepare_metadata",
        "run_reportree",
        "process_features",
        "upload_features",
        "upload_clustering",
        "upload_distance",
    ):
        pipeline_state[GLOBAL_PROFILE][stage]["status"] = Status.SKIPPED

    if args.skip_similarity:
        for stage in ("run_similarity", "upload_similarity"):
            pipeline_state[GLOBAL_PROFILE][stage]["status"] = Status.SKIPPED

    render_pipeline_state(pipeline_state)

    credentials = load_credentials(args.credentials)
    token = get_access_token(credentials)
    upload_token = authenticate_mimosa_user(credentials)

    base_dir = args.output if args.save_files else tempfile.mkdtemp(prefix="mimosa_tmp_")
    if args.save_files:
        os.makedirs(base_dir, exist_ok=True)

    all_target_ids = set()

    try:
        all_samples = fetch_samples(credentials["bonsai_api_url"], token)
        analyzed_ids = get_analyzed_sample_ids()
        any_new_samples = False

        for profile in target_profiles:
            pipeline_state[profile]["fetch_samples"]["status"] = Status.DONE
        pipeline_state[GLOBAL_PROFILE]["fetch_samples"]["status"] = Status.DONE
        render_pipeline_state(pipeline_state)

        for profile in target_profiles:
            if args.update:
                target_ids = {
                    s["sample_id"]
                    for s in all_samples
                    if s.get("profile") == profile
                    and s.get("sample_id") in analyzed_ids
                }
                if not target_ids:
                    print(f"No samples to update for profile '{profile}'.")
                    continue
            else:
                new_ids = get_new_sample_ids(all_samples, analyzed_ids, profile)
                if not new_ids:
                    if not prompt_if_no_new_samples(profile, new_ids):
                        continue
                    target_ids = analyzed_ids
                else:
                    target_ids = new_ids
                    any_new_samples = True

            pipeline_state[profile]["fetch_samples"]["count"] = len(target_ids)
            all_target_ids.update(target_ids)

            profile_dir = os.path.join(base_dir, profile)
            mimosa(
                profile,
                profile_dir,
                args,
                credentials,
                token,
                target_ids,
                upload_token,
                pipeline_state,
            )

        run_similarity = True

        if args.skip_similarity or not all_target_ids:
            run_similarity = False

        elif not any_new_samples:
            answer = input(
                "\nNo new samples detected across any profile. "
                "Do you want to recompute similarity anyway? (yes/no): "
            ).strip().lower()
            if answer not in ("yes", "y"):
                run_similarity = False

        if run_similarity:
            print("\nRunning similarity")

            pipeline_state[GLOBAL_PROFILE]["run_similarity"]["total"] = len(all_target_ids)
            pipeline_state[GLOBAL_PROFILE]["run_similarity"]["done"] = 0
            render_pipeline_state(pipeline_state)

            def similarity_progress():
                pipeline_state[GLOBAL_PROFILE]["run_similarity"]["done"] += 1
                render_pipeline_state(pipeline_state)

            run_stage(
                pipeline_state,
                GLOBAL_PROFILE,
                "run_similarity",
                process_similarity,
                credentials["bonsai_api_url"],
                token,
                sorted(all_target_ids),
                base_dir,
                "combined",
                save_files=True,
                progress_callback=similarity_progress,
            )

            similarity_path = os.path.join(base_dir, "combined_similarity.json")

            run_stage(
                pipeline_state,
                GLOBAL_PROFILE,
                "upload_similarity",
                upload_similarity,
                similarity_path,
                upload_token=upload_token,
                count=len(all_target_ids),
            )

    finally:
        if not args.save_files and os.path.exists(base_dir):
            shutil.rmtree(base_dir, ignore_errors=True)

    render_runtime_summary(pipeline_state)


if __name__ == "__main__":
    main()

