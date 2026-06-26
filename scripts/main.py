#!/usr/bin/env python3
import argparse
import logging
import os
import sys
import tempfile
import shutil
import time
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient

from log_setup import configure_logging
from api import (
    load_credentials,
    get_access_token,
    fetch_samples,
    fetch_group,
    validate_groups,
    authenticate_mimosa_user,
    get_current_user,
    send_pipeline_alert,
)
from upload import upload_similarity, delete_features
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
from constants import AVAILABLE_PROFILES, ALLOWED_QC_STATUSES

log = logging.getLogger(__name__)


class ErrorCollectingHandler(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.ERROR)
        self.messages = []

    def emit(self, record):
        self.messages.append(record.getMessage())


env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


def parse_exclusions(values):
    """
    Return a set of IDs from an inline list or a file path.
    """
    if not values:
        return set()
    if len(values) == 1 and os.path.isfile(values[0]):
        ids = set()
        with open(values[0], newline="", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                ids.add(line.split(",")[0].strip())
        return ids
    return set(values)


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
    parser.add_argument(
        "--email",
        nargs="?",
        const="",
        default=None,
        metavar="ADDRESS",
        help="Send a failure alert email on errors. Without a value, sends to the authenticated user. With a value, sends to that address.",
    )
    parser.add_argument(
        "--exclude-samples",
        required=False,
        nargs="+",
        default=None,
        metavar="ID_OR_FILE",
        help="Sample IDs to exclude, or path to a file with one ID per line.",
    )
    parser.add_argument(
        "--exclude-groups",
        required=False,
        nargs="+",
        default=None,
        metavar="ID_OR_FILE",
        help="Group IDs to exclude, or path to a file with one ID per line.",
    )

    args = parser.parse_args()

    if args.save_files and not args.output:
        parser.error("--save_files requires --output")

    if args.profile is None and args.groups is None:
        target_profiles = AVAILABLE_PROFILES
    elif args.profile is None:
        target_profiles = AVAILABLE_PROFILES
    elif any(x.lower() == "all" for x in args.profile):
        target_profiles = AVAILABLE_PROFILES
    else:
        requested = [x.lower() for x in args.profile]
        target_profiles = [p for p in AVAILABLE_PROFILES if p in requested]

    if not target_profiles:
        available = ", ".join(AVAILABLE_PROFILES)
        raise SystemExit(f"No valid profiles selected. Available profiles: {available}")

    return args, target_profiles


def get_analyzed_sample_ids(profile=None):
    """
    Fetch IDs of samples already analyzed in MIMOSA (from features collection).
    Optionally scoped to a specific analysis profile.
    """
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set.")

    db_name = os.getenv("MONGO_DB_NAME")
    client = MongoClient(mongo_uri)
    try:
        db = client[db_name]
        query = {"properties.analysis_profile": profile} if profile else {}
        feature_ids = set(db["features"].distinct("properties.ID", query))
    finally:
        client.close()
    return feature_ids


def decide_clustering(profile, new_ids, args, is_interactive):
    """
    Decide whether to run clustering for a profile.
    """
    if new_ids:
        log.info(f"profile={profile} event=new_samples count={len(new_ids)}")
        return True

    if args.re_cluster:
        log.info(f"profile={profile} event=recluster_forced")
        return True

    if is_interactive:
        user_input = (
            input(f"No new samples for {profile}. Re-run clustering? (yes/no): ")
            .strip()
            .lower()
        )
        decision = user_input in ("yes", "y")
        log.info(
            f"profile={profile} event=recluster_user_decision decision={'yes' if decision else 'no'}"
        )
        return decision

    return False


def main():
    configure_logging()
    args, target_profiles = parse_args()

    excluded_samples = parse_exclusions(args.exclude_samples)
    excluded_groups = parse_exclusions(args.exclude_groups)

    if excluded_samples:
        log.info(f"event=samples_excluded count={len(excluded_samples)}")
    if excluded_groups:
        log.info(f"event=groups_excluded count={len(excluded_groups)}")

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

    error_handler = None
    if args.email is not None:
        error_handler = ErrorCollectingHandler()
        logging.getLogger().addHandler(error_handler)

    all_ids_for_similarity = set()
    clustering_failed_profiles = set()
    filtered_scope = {}
    is_interactive = sys.stdin.isatty()

    run_start = time.monotonic()
    _interrupted = False

    try:
        all_samples = fetch_samples(credentials["bonsai_api_url"], token)
        group_sample_ids = None
        if args.groups:
            group_sample_ids = set()
            for gid in args.groups:
                if gid in excluded_groups:
                    log.info(f"event=group_skipped group={gid}")
                    continue
                group_sample_ids.update(
                    fetch_group(credentials["bonsai_api_url"], token, gid)
                )

        allowed_qc_upper = (
            {s.upper() for s in ALLOWED_QC_STATUSES} if ALLOWED_QC_STATUSES else None
        )

        filtered_scope = {}
        for profile in target_profiles:
            profile_samples = [s for s in all_samples if s.get("profile") == profile]

            if allowed_qc_upper:
                qc_excluded_for_profile = set()
                passing_samples = []
                for s in profile_samples:
                    sid = s.get("sample_id")
                    if not sid:
                        continue
                    raw = (s.get("qc_status") or {}).get("status")
                    if raw is None or raw.upper() not in allowed_qc_upper:
                        qc_excluded_for_profile.add(sid)
                    else:
                        passing_samples.append(s)
            else:
                passing_samples = profile_samples
                qc_excluded_for_profile = set()

            profile_all_ids = {
                s["sample_id"] for s in passing_samples if "sample_id" in s
            } - excluded_samples

            if group_sample_ids is not None:
                group_ids = profile_all_ids & group_sample_ids
            else:
                group_ids = profile_all_ids

            if group_ids:
                filtered_scope[profile] = {
                    "group_ids": group_ids,
                    "profile_all_ids": profile_all_ids,
                    "qc_excluded": qc_excluded_for_profile,
                }

        if filtered_scope:
            state_profiles = list(filtered_scope.keys())
            if args.run_similarity:
                state_profiles.append(GLOBAL_PROFILE)

            pipeline_state = init_pipeline_state(state_profiles, mode=display_mode)

            for profile in state_profiles:
                if profile != GLOBAL_PROFILE and profile in filtered_scope:
                    pipeline_state[profile]["fetch_samples"]["count"] = len(
                        filtered_scope[profile]["group_ids"]
                    )

            render_pipeline_state(pipeline_state)
        else:
            log.info("event=no_samples_found")
            return

        for profile, scope in filtered_scope.items():
            group_ids = scope["group_ids"]
            profile_all_ids = scope["profile_all_ids"]
            qc_excluded_for_profile = scope.get("qc_excluded", set())

            analyzed_ids = get_analyzed_sample_ids(profile=profile)

            new_ids = group_ids - analyzed_ids
            existing_ids = group_ids & analyzed_ids
            profile_start_time = time.monotonic()
            log.info(
                f"profile={profile} event=profile_start samples_total={len(group_ids)} new={len(new_ids)} existing={len(existing_ids)}"
            )

            if group_sample_ids is not None:
                already_analyzed_for_profile = analyzed_ids & profile_all_ids
                clustering_ids = group_ids | already_analyzed_for_profile
            else:
                clustering_ids = group_ids

            profile_dir = os.path.join(base_dir, profile)

            if args.update_only:
                log.info(f"profile={profile} event=update_only_mode")

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
                    newly_qc_failed = qc_excluded_for_profile & analyzed_ids
                    if newly_qc_failed:
                        log.warning(
                            f"profile={profile} event=qc_status_changed count={len(newly_qc_failed)} action=re-run_without_update-only"
                        )
                except Exception as e:
                    log.error(f'profile={profile} event=error message="{e}"')
                    clustering_failed_profiles.add(profile)

                log.info(
                    f"profile={profile} event=profile_complete duration={time.monotonic() - profile_start_time:.1f}s"
                )
                continue

            run_clustering = decide_clustering(profile, new_ids, args, is_interactive)

            if not run_clustering:
                set_profile_mode(pipeline_state, profile, "update")
                render_pipeline_state(pipeline_state)

            if run_clustering:
                target_ids = clustering_ids
            else:
                target_ids = existing_ids

            newly_qc_failed = qc_excluded_for_profile & analyzed_ids
            if newly_qc_failed and not run_clustering:
                log.warning(
                    f"profile={profile} event=qc_status_changed count={len(newly_qc_failed)} action=recluster_triggered"
                )
                run_clustering = True
                target_ids = clustering_ids

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
                    is_interactive=is_interactive,
                )

                if did_cluster and newly_qc_failed:
                    proceed = True
                    if is_interactive:
                        answer = (
                            input(
                                f"[{profile}] Remove {len(newly_qc_failed)} QC-excluded "
                                f"sample(s) from the database? (yes/no): "
                            )
                            .strip()
                            .lower()
                        )
                        proceed = answer in ("yes", "y")
                    if proceed:
                        delete_features(newly_qc_failed, profile, upload_token)
                    else:
                        log.info(
                            f"profile={profile} event=qc_deletion_skipped count={len(newly_qc_failed)}"
                        )

            except Exception as e:
                log.error(f'profile={profile} event=clustering_failed message="{e}"')
                clustering_failed_profiles.add(profile)

                try:
                    log.info(
                        f"profile={profile} event=metadata_sync_fallback samples={len(existing_ids)}"
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
                    log.error(
                        f'profile={profile} event=metadata_sync_failed message="{metadata_error}"'
                    )

            log.info(
                f"profile={profile} event=profile_complete duration={time.monotonic() - profile_start_time:.1f}s"
            )
            all_ids_for_similarity.update(group_ids)

        if args.run_similarity and all_ids_for_similarity:
            if clustering_failed_profiles:
                log.warning(
                    f"event=similarity_partial_data failed_profiles={len(clustering_failed_profiles)} samples={len(all_ids_for_similarity)}"
                )

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
                log.error(f'event=similarity_failed message="{e}"')

        if clustering_failed_profiles:
            log.error(
                f"event=clustering_failed_summary profiles={', '.join(sorted(clustering_failed_profiles))}"
            )

    except KeyboardInterrupt:
        _interrupted = True
        raise

    finally:
        if not args.save_files and os.path.exists(base_dir):
            shutil.rmtree(base_dir, ignore_errors=True)
        elapsed = time.monotonic() - run_start
        if _interrupted:
            log.warning(f"event=pipeline_interrupted duration={elapsed:.1f}s")
        else:
            log.info(
                f"event=pipeline_complete duration={elapsed:.1f}s"
                f" profiles_processed={len(filtered_scope)}"
                f" samples_processed={len(all_ids_for_similarity)}"
                f" failures={len(clustering_failed_profiles)}"
            )

        if not _interrupted and error_handler and error_handler.messages:
            try:
                alert_recipient = args.email if args.email else None
                if not alert_recipient:
                    try:
                        me = get_current_user(upload_token)
                        alert_recipient = me.get("email")
                    except Exception:
                        pass
                if alert_recipient:
                    send_pipeline_alert(
                        upload_token,
                        errors=error_handler.messages,
                        profiles=list(filtered_scope.keys()),
                        recipient=alert_recipient,
                    )
                    log.info(f"event=alert_sent recipient={alert_recipient}")
            except Exception as alert_err:
                log.warning(f'event=alert_send_failed message="{alert_err}"')

    render_runtime_summary(pipeline_state)


if __name__ == "__main__":
    main()
