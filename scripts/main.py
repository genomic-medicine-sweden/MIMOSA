#!/usr/bin/env python3
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
from upload import (
    upload_similarity,
    delete_features,
    fetch_excluded_sample_ids,
    fetch_excluded_group_ids,
    save_excluded_samples_to_db,
    save_excluded_groups_to_db,
)
from process_similarity import process_similarity
from MIMOSA import mimosa

from mimosa_state import (
    GLOBAL_PROFILE,
    CHEWBBACA_IMPORT_PROFILE,
    Status,
    init_pipeline_state,
    render_pipeline_state,
    render_runtime_summary,
    set_profile_mode,
)
from mimosa_runner import run_stage
from constants import AVAILABLE_PROFILES, ALLOWED_QC_STATUSES
from chewbbaca.source import collect_chewbbaca_inputs
from chewbbaca.allele_profiles import (
    DuplicateAlleleProfileError,
    delete_allele_profile,
    find_allele_profile,
    get_allele_profile_collection,
    load_allele_profiles,
    overwrite_allele_profile,
    store_allele_profile,
)
from chewbbaca.conflicts import resolve_bonsai_chewbbaca_conflicts, _duplicate_action
from log_updates import log_conflict_event
from cli import parse_args, parse_exclusions, source_mode

log = logging.getLogger(__name__)


class ErrorCollectingHandler(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.ERROR)
        self.messages = []

    def emit(self, record):
        self.messages.append(record.getMessage())


env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


def prepare_chewbbaca_inputs(path, profile):
    result = collect_chewbbaca_inputs(path, profile=profile)
    samples = result["samples"]
    outcomes = result["outcomes"]

    parsed = sum(1 for outcome in outcomes if outcome["status"].startswith("parsed"))
    skipped = sum(1 for outcome in outcomes if outcome["status"] == "skipped")
    failed = sum(1 for outcome in outcomes if outcome["status"] == "failed")
    log.info(
        "event=chewbbaca_inputs_summary entries=%s parsed=%s skipped=%s "
        "failed=%s samples=%s",
        len(outcomes),
        parsed,
        skipped,
        failed,
        len(samples),
    )

    for outcome in outcomes:
        status = outcome["status"]
        if status == "skipped":
            log.warning(
                "event=chewbbaca_input_skipped input=%s reason=%s",
                outcome.get("input"),
                outcome.get("reason"),
            )
        elif status == "failed":
            log.error(
                "event=chewbbaca_input_failed input=%s error=%s",
                outcome.get("input"),
                outcome.get("error"),
            )
        elif status == "parsed_manifest_id_ignored_multi_sample":
            log.warning(
                "event=chewbbaca_manifest_id_ignored input=%s manifest_id=%s "
                "samples=%s",
                outcome.get("input"),
                outcome.get("manifest_id"),
                len(outcome.get("samples") or []),
            )

    return result


def store_chewbbaca_allele_profiles(chewbbaca_samples, is_interactive):
    if not chewbbaca_samples:
        return {
            "stored": 0,
            "duplicates": 0,
            "replaced": 0,
            "skipped": 0,
        }

    client, collection = get_allele_profile_collection()
    summary = {
        "stored": 0,
        "duplicates": 0,
        "replaced": 0,
        "skipped": 0,
    }

    try:
        for sample in chewbbaca_samples:
            sample_id = sample["sample_id"]
            analysis_profile = sample.get("analysis_profile", "")
            if not analysis_profile:
                log.warning(
                    "event=chewbbaca_profile_missing sample=%s",
                    sample_id,
                )
                summary["skipped"] += 1
                continue
            filename = os.path.basename(sample.get("source_path") or "")

            try:
                store_allele_profile(
                    collection,
                    sample_id,
                    analysis_profile,
                    sample["alleles"],
                    filename,
                )
                summary["stored"] += 1
                log.info(
                    "event=chewbbaca_profile_stored sample=%s profile=%s",
                    sample_id,
                    analysis_profile,
                )
            except DuplicateAlleleProfileError:
                summary["duplicates"] += 1
                action = _duplicate_action(
                    sample_id,
                    analysis_profile,
                    is_interactive,
                )
                if action == "replace":
                    overwrite_allele_profile(
                        collection,
                        sample_id,
                        analysis_profile,
                        sample["alleles"],
                        filename,
                    )
                    summary["replaced"] += 1
                    log.warning(
                        "event=chewbbaca_profile_duplicate sample=%s "
                        "profile=%s action=replace",
                        sample_id,
                        analysis_profile,
                    )
                else:
                    summary["skipped"] += 1
                    log.warning(
                        "event=chewbbaca_profile_duplicate sample=%s "
                        "profile=%s action=skip",
                        sample_id,
                        analysis_profile,
                    )
    finally:
        client.close()

    return summary


def check_incomplete_clustering_warning(target_profiles, is_interactive):
    """
    In chewbbaca-only mode, check if Bonsai-sourced features already exist for any
    target profile. If so, prompt the user to switch to bonsai_chewbbaca mode instead.

    Returns True if the caller should switch to bonsai_chewbbaca (include Bonsai),
    False to proceed chewbbaca-only.
    Non-interactive: aborts unless CHEWBBACA_IGNORE_BONSAI_WARNING=1 is set.
    """
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        return False

    db_name = os.getenv("MONGO_DB_NAME")
    try:
        client = MongoClient(mongo_uri)
        try:
            db = client[db_name]
            affected = {}
            for profile in target_profiles:
                count = db["features"].count_documents(
                    {
                        "properties.analysis_profile": profile,
                        "properties.source": "bonsai",
                    }
                )
                if count > 0:
                    affected[profile] = count

            if not affected:
                return False

            for profile, count in affected.items():
                log.warning(
                    "event=incomplete_clustering_warning profile=%s bonsai_count=%s",
                    profile,
                    count,
                )
                print(
                    f"\nWARNING [{profile}]: {count} Bonsai sample(s) from a previous "
                    "run will be excluded from clustering.",
                    flush=True,
                )
            print(
                "Incomplete clustering may occur — those samples will show as "
                "'cluster unknown' in MIMOSA.\n",
                flush=True,
            )

            if is_interactive:
                answer = input("Include Bonsai samples? [Y/n] ").strip().lower()
                if answer in ("", "y", "yes"):
                    print("Switching to Bonsai + chewBBACA mode.\n", flush=True)
                    return True
                return False
            else:
                if os.getenv("CHEWBBACA_IGNORE_BONSAI_WARNING"):
                    return False
                log.warning(
                    "event=auto_upgrade_to_bonsai profiles=%s "
                    "reason=bonsai_features_exist_in_db",
                    ", ".join(affected),
                )
                return True
        finally:
            client.close()
    except SystemExit:
        raise
    except Exception as exc:
        log.debug("event=incomplete_clustering_warning_skipped reason=%s", exc)
        return False


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
            input(
                f"[{profile}] No new samples detected. Re-run clustering anyway? [y/N] "
            )
            .strip()
            .lower()
        )
        decision = user_input in ("yes", "y")
        log.info(
            f"profile={profile} event=recluster_user_decision decision={'yes' if decision else 'no'}"
        )
        return decision

    return False


def _store_cleanup_from_env():
    action = os.getenv("CHEWBBACA_STORE_CLEANUP")
    if not action:
        return None
    action = action.strip().lower()
    if action not in {"keep", "delete"}:
        raise SystemExit("CHEWBBACA_STORE_CLEANUP must be 'keep' or 'delete'.")
    return action


def _resolve_store_cleanup(sample_id, is_interactive):
    """
    Return True if the local MongoDB copy should be deleted after Bonsai wins.
    """
    forced = _store_cleanup_from_env()
    if forced is not None:
        return forced == "delete"
    if is_interactive:
        answer = (
            input(
                f"Sample {sample_id} has an allele profile stored in MongoDB, "
                "but Bonsai data will be used for this run.\n"
                "Delete the stored allele profile from MongoDB? [y/N] "
            )
            .strip()
            .lower()
        )
        return answer in ("y", "yes")
    return False


def _run_chewbbaca_import(chewbbaca_inputs, mode, credentials, token, is_interactive):
    all_chewbbaca_samples = []
    all_chewbbaca_outcomes = []
    for inp in chewbbaca_inputs:
        r = prepare_chewbbaca_inputs(inp["path"], inp["profile"])
        all_chewbbaca_samples.extend(r["samples"])
        all_chewbbaca_outcomes.extend(r["outcomes"])
    result = {"samples": all_chewbbaca_samples, "outcomes": all_chewbbaca_outcomes}

    conflict_result = None
    import_samples = result["samples"]
    cached_bonsai_samples = None

    if mode == "bonsai_chewbbaca":
        cached_bonsai_samples = fetch_samples(credentials["bonsai_api_url"], token)
        conflict_result = resolve_bonsai_chewbbaca_conflicts(
            result["samples"],
            cached_bonsai_samples,
            is_interactive,
        )
        _import_ids = set(conflict_result["chewbbaca_ready"]) | set(
            conflict_result.get("use_chewbbaca", [])
        )
        import_samples = [
            sample
            for sample in result["samples"]
            if sample.get("sample_id") in _import_ids
        ]

        _use_bonsai_ids = set(conflict_result.get("use_bonsai", []))
        _store_cleanup_actions = {}  # chewbbaca_id -> "deleted" | "kept" | None
        if _use_bonsai_ids:
            _ap_client, _ap_collection = get_allele_profile_collection()
            try:
                for sample in result["samples"]:
                    sid = sample.get("sample_id")
                    profile = sample.get("analysis_profile")
                    if sid not in _use_bonsai_ids or not profile:
                        continue
                    if not find_allele_profile(_ap_collection, sid, profile):
                        _store_cleanup_actions[sid] = None
                        continue
                    if _resolve_store_cleanup(sid, is_interactive):
                        delete_allele_profile(_ap_collection, sid, profile)
                        _store_cleanup_actions[sid] = "deleted"
                        log.info(
                            "event=chewbbaca_store_cleanup sample=%s profile=%s "
                            "action=deleted reason=bonsai_wins",
                            sid,
                            profile,
                        )
                    else:
                        _store_cleanup_actions[sid] = "kept"
                        log.info(
                            "event=chewbbaca_store_cleanup sample=%s profile=%s "
                            "action=kept reason=bonsai_wins",
                            sid,
                            profile,
                        )
            finally:
                _ap_client.close()

        if conflict_result.get("decisions"):
            _sample_profile_map = {
                s["sample_id"]: s.get("analysis_profile")
                for s in result["samples"]
                if s.get("sample_id")
            }
            _log_entries = []
            for d in conflict_result["decisions"]:
                entry = {
                    "bonsai_id": d["bonsai_id"],
                    "chewbbaca_id": d["chewbbaca_id"],
                    "profile": _sample_profile_map.get(d["chewbbaca_id"]),
                    "action": d["action"],
                }
                if (
                    d["action"] == "use_bonsai"
                    and d["chewbbaca_id"] in _store_cleanup_actions
                ):
                    entry["store_action"] = _store_cleanup_actions[d["chewbbaca_id"]]
                _log_entries.append(entry)

            _log_client = MongoClient(os.getenv("MONGO_URI"))
            try:
                log_conflict_event(
                    _log_client[os.getenv("MONGO_DB_NAME")],
                    _log_entries,
                    triggered_by=credentials.get("mimosa_username") or "automation",
                )
            finally:
                _log_client.close()

    import_summary = store_chewbbaca_allele_profiles(import_samples, is_interactive)

    log.info(
        "event=chewbbaca_import_complete mode=%s inputs=%s samples=%s",
        mode,
        len(result["outcomes"]),
        len(result["samples"]),
    )
    if conflict_result is not None:
        log.info(
            "event=conflict_summary conflicts=%s chewbbaca_ready=%s "
            "use_bonsai=%s use_chewbbaca=%s excluded=%s",
            len(conflict_result["conflicts"]),
            len(conflict_result["chewbbaca_ready"]),
            len(conflict_result["use_bonsai"]),
            len(conflict_result["use_chewbbaca"]),
            len(conflict_result["excluded"]),
        )
    log.info(
        "event=profile_store_summary stored=%s duplicates=%s replaced=%s skipped=%s",
        import_summary["stored"],
        import_summary["duplicates"],
        import_summary["replaced"],
        import_summary["skipped"],
    )

    chewbbaca_profile_set = {inp["profile"] for inp in chewbbaca_inputs}
    ap_client, ap_collection = get_allele_profile_collection()
    try:
        stored_profiles = []
        for cp in sorted(chewbbaca_profile_set):
            stored_profiles.extend(load_allele_profiles(ap_collection, cp))
    finally:
        ap_client.close()

    if conflict_result is not None:
        _skip_local = set(conflict_result.get("use_bonsai", [])) | set(
            conflict_result.get("excluded", [])
        )
        chewbbaca_profiles_for_pipeline = [
            p for p in stored_profiles if p["sample_id"] not in _skip_local
        ]
    else:
        chewbbaca_profiles_for_pipeline = stored_profiles

    return {
        "chewbbaca_profiles_for_pipeline": chewbbaca_profiles_for_pipeline,
        "cached_bonsai_samples": cached_bonsai_samples,
        "sample_count": len(chewbbaca_profiles_for_pipeline),
    }


def main():
    configure_logging()
    args, target_profiles = parse_args()

    excluded_samples = parse_exclusions(args.exclude_samples)
    excluded_groups = parse_exclusions(args.exclude_groups)

    if excluded_samples:
        log.info(f"event=samples_excluded count={len(excluded_samples)}")
    if excluded_groups:
        log.info(f"event=groups_excluded count={len(excluded_groups)}")

    mode = source_mode(args)
    is_interactive = sys.stdin.isatty()

    if mode == "chewbbaca":
        if check_incomplete_clustering_warning(target_profiles, is_interactive):
            args.bonsai = True
            mode = "bonsai_chewbbaca"

    credentials = load_credentials(args.credentials, require_bonsai=args.bonsai)
    token = get_access_token(credentials) if args.bonsai else None

    display_mode = "update" if args.update_only else "full"
    pipeline_state = {"_mode": display_mode, "_profile_modes": {}}

    chewbbaca_profiles_for_pipeline = []
    cached_bonsai_samples = None

    if args.chewbbaca_inputs:
        pipeline_state[CHEWBBACA_IMPORT_PROFILE] = {
            "chewbbaca_import": {
                "status": Status.PENDING,
                "count": 0,
                "done": 0,
                "total": 0,
                "started_at": None,
                "finished_at": None,
                "duration": None,
            }
        }
        render_pipeline_state(pipeline_state)

        import_result = run_stage(
            pipeline_state,
            CHEWBBACA_IMPORT_PROFILE,
            "chewbbaca_import",
            _run_chewbbaca_import,
            args.chewbbaca_inputs,
            mode,
            credentials,
            token,
            is_interactive,
        )

        chewbbaca_profiles_for_pipeline = import_result[
            "chewbbaca_profiles_for_pipeline"
        ]
        cached_bonsai_samples = import_result["cached_bonsai_samples"]
        pipeline_state[CHEWBBACA_IMPORT_PROFILE]["chewbbaca_import"]["count"] = (
            import_result["sample_count"]
        )

    if mode == "chewbbaca" and not chewbbaca_profiles_for_pipeline:
        ap_client, ap_collection = get_allele_profile_collection()
        try:
            for profile_name in target_profiles:
                chewbbaca_profiles_for_pipeline.extend(
                    load_allele_profiles(ap_collection, profile_name)
                )
        finally:
            ap_client.close()
        if not chewbbaca_profiles_for_pipeline:
            return

    if args.bonsai and args.groups:
        try:
            validate_groups(credentials["bonsai_api_url"], token, args.groups)
        except ValueError as e:
            raise SystemExit(f"Error: {e}\nPlease check the group IDs and try again.")

    upload_token = authenticate_mimosa_user(credentials)

    db_excluded_samples = fetch_excluded_sample_ids(target_profiles)
    db_excluded_groups = fetch_excluded_group_ids()
    excluded_samples = excluded_samples | db_excluded_samples
    excluded_groups = excluded_groups | db_excluded_groups
    if db_excluded_samples:
        log.info(f"event=db_excluded_samples count={len(db_excluded_samples)}")
    if db_excluded_groups:
        log.info(f"event=db_excluded_groups count={len(db_excluded_groups)}")

    if is_interactive:
        cli_samples = parse_exclusions(args.exclude_samples)
        new_sample_exclusions = cli_samples - db_excluded_samples
        if new_sample_exclusions:
            print(
                f"\n{len(new_sample_exclusions)} sample(s) via --exclude-samples are not yet saved to the DB:"
            )
            for sid in sorted(new_sample_exclusions):
                print(f"  {sid}")
            answer = (
                input("Save to excluded_samples DB for future runs? [y/N] ")
                .strip()
                .lower()
            )
            if answer in ("y", "yes"):
                save_excluded_samples_to_db(new_sample_exclusions)

        cli_groups = parse_exclusions(args.exclude_groups)
        new_group_exclusions = cli_groups - db_excluded_groups
        if new_group_exclusions:
            print(
                f"\n{len(new_group_exclusions)} group(s) via --exclude-groups are not yet saved to the DB:"
            )
            for gid in sorted(new_group_exclusions):
                print(f"  {gid}")
            answer = (
                input("Save to excluded_groups DB for future runs? [y/N] ")
                .strip()
                .lower()
            )
            if answer in ("y", "yes"):
                save_excluded_groups_to_db(new_group_exclusions)

    if args.delete_samples:
        ids_to_delete = list(args.delete_samples)
        profile = target_profiles[0] if len(target_profiles) == 1 else "unknown"

        print(f"Samples to delete ({len(ids_to_delete)}):")
        for sid in ids_to_delete:
            print(f"  {sid}")

        proceed = True
        if is_interactive:
            answer = (
                input(f"\nDelete {len(ids_to_delete)} sample(s) from MIMOSA? [y/N] ")
                .strip()
                .lower()
            )
            proceed = answer in ("y", "yes")

        if proceed:
            delete_features(ids_to_delete, profile=profile, upload_token=upload_token)
            if is_interactive:
                answer = (
                    input("Re-run pipeline to update clustering? [y/N] ")
                    .strip()
                    .lower()
                )
                if answer not in ("y", "yes"):
                    return
            # non-interactive: fall through and re-run
        else:
            return

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
    group_sample_ids = None

    run_start = time.monotonic()
    _interrupted = False

    try:
        if mode == "chewbbaca":
            for doc in chewbbaca_profiles_for_pipeline:
                profile = doc.get("analysis_profile")
                sid = doc.get("sample_id")
                if not profile or not sid or sid in excluded_samples:
                    continue
                if profile not in target_profiles:
                    continue
                scope = filtered_scope.setdefault(
                    profile,
                    {
                        "group_ids": set(),
                        "profile_all_ids": set(),
                        "qc_excluded": set(),
                    },
                )
                scope["group_ids"].add(sid)
                scope["profile_all_ids"].add(sid)
        else:
            all_samples = cached_bonsai_samples or fetch_samples(
                credentials["bonsai_api_url"], token
            )

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
                {s.upper() for s in ALLOWED_QC_STATUSES}
                if ALLOWED_QC_STATUSES
                else None
            )

            for profile in target_profiles:
                profile_samples = [
                    s for s in all_samples if s.get("profile") == profile
                ]

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

            if mode == "bonsai_chewbbaca" and chewbbaca_profiles_for_pipeline:
                for doc in chewbbaca_profiles_for_pipeline:
                    profile = doc.get("analysis_profile")
                    sid = doc.get("sample_id")
                    if not profile or not sid or sid in excluded_samples:
                        continue
                    scope = filtered_scope.setdefault(
                        profile,
                        {
                            "group_ids": set(),
                            "profile_all_ids": set(),
                            "qc_excluded": set(),
                        },
                    )
                    scope["group_ids"].add(sid)
                    scope["profile_all_ids"].add(sid)

            if mode == "bonsai":
                _bonsai_chewbbaca_seen = {
                    p["sample_id"] for p in chewbbaca_profiles_for_pipeline
                }
                for scope_profile in target_profiles:
                    try:
                        _ap_client, _ap_coll = get_allele_profile_collection()
                        try:
                            _prev_chewbbaca = load_allele_profiles(
                                _ap_coll, scope_profile
                            )
                        finally:
                            _ap_client.close()
                    except Exception as _exc:
                        log.warning(
                            "event=load_prev_chewbbaca_profiles_failed profile=%s reason=%s",
                            scope_profile,
                            _exc,
                        )
                        _prev_chewbbaca = []
                    for doc in _prev_chewbbaca:
                        sid = doc.get("sample_id")
                        if not sid or sid in excluded_samples:
                            continue
                        if sid not in _bonsai_chewbbaca_seen:
                            chewbbaca_profiles_for_pipeline.append(doc)
                            _bonsai_chewbbaca_seen.add(sid)
                        scope = filtered_scope.setdefault(
                            scope_profile,
                            {
                                "group_ids": set(),
                                "profile_all_ids": set(),
                                "qc_excluded": set(),
                            },
                        )
                        scope["group_ids"].add(sid)
                        scope["profile_all_ids"].add(sid)

        if filtered_scope:
            state_profiles = list(filtered_scope.keys())
            if args.run_similarity:
                state_profiles.append(GLOBAL_PROFILE)

            profile_state = init_pipeline_state(state_profiles, mode=display_mode)
            pipeline_state.update(profile_state)

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
                    _profile_chewbbaca = [
                        p
                        for p in chewbbaca_profiles_for_pipeline
                        if p.get("analysis_profile") == profile
                    ]
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
                        chewbbaca_profiles=_profile_chewbbaca or None,
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
                _profile_chewbbaca = [
                    p
                    for p in chewbbaca_profiles_for_pipeline
                    if p.get("analysis_profile") == profile
                ]
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
                    chewbbaca_profiles=_profile_chewbbaca or None,
                )

                if did_cluster and newly_qc_failed:
                    proceed = True
                    if is_interactive:
                        answer = (
                            input(
                                f"[{profile}] {len(newly_qc_failed)} sample(s) failed QC "
                                "and were excluded from clustering. Remove their features "
                                "from MIMOSA? [y/N] "
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
                        chewbbaca_profiles=_profile_chewbbaca or None,
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
