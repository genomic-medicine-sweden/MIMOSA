#!/usr/bin/env python3

import hashlib
import json
import logging
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import requests as http_requests
from dotenv import load_dotenv
from pathlib import Path

from main import main as run_pipeline
from log_setup import configure_logging
from api import load_credentials, authenticate_mimosa_user, send_pipeline_alert

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

configure_logging()
log = logging.getLogger(__name__)

_pipeline_lock = threading.Lock()


def _safe_check_and_run(profiles_override=None):
    if not _pipeline_lock.acquire(blocking=False):
        log.info("event=trigger_skipped reason=already_running")
        return False
    try:
        check_and_run(profiles_override=profiles_override)
    finally:
        _pipeline_lock.release()
    return True


class _TriggerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/trigger":
            profiles_override = None
            content_length = int(self.headers.get("Content-Length", 0) or 0)
            if content_length > 0:
                try:
                    data = json.loads(self.rfile.read(content_length))
                    if isinstance(data.get("profiles"), list):
                        profiles_override = [
                            p for p in data["profiles"] if isinstance(p, str) and p
                        ] or None
                except (json.JSONDecodeError, AttributeError):
                    pass

            lock_free = _pipeline_lock.acquire(blocking=False)
            if lock_free:
                _pipeline_lock.release()
                threading.Thread(
                    target=_safe_check_and_run,
                    args=(profiles_override,),
                    daemon=True,
                ).start()
                resp = {"triggered": True}
                if profiles_override:
                    resp["profiles"] = profiles_override
                body = json.dumps(resp).encode()
                self.send_response(202)
            else:
                log.info("event=trigger_skipped reason=already_running")
                body = json.dumps(
                    {"triggered": False, "reason": "pipeline_already_running"}
                ).encode()
                self.send_response(409)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass


def _start_trigger_server():
    port = int(os.getenv("AUTOMATION_TRIGGER_PORT", "8081"))
    try:
        server = HTTPServer(("0.0.0.0", port), _TriggerHandler)
        log.info("event=trigger_server_start port=%d", port)
        server.serve_forever()
    except Exception as e:
        log.warning("event=trigger_server_failed error=%s", e)


def wait_for_backend(timeout=300, interval=5):
    base_url = os.getenv("MIMOSA_API_INTERNAL", "http://mimosa-backend:5000")
    url = f"{base_url}/api/users/me"

    log.info(f"event=backend_wait timeout={timeout}s")
    elapsed = 0

    while elapsed < timeout:
        try:
            http_requests.get(url, timeout=3)
            log.info("event=backend_ready")
            return
        except Exception:
            time.sleep(interval)
            elapsed += interval

    raise RuntimeError("Backend did not become ready within 5 minutes.")


def _bonsai_enabled():
    return os.getenv("AUTOMATION_BONSAI_ENABLED", "true").lower() != "false"


def _resolve_profiles(profile_override=None, profiles_override=None):
    if profiles_override:
        return list(profiles_override)
    if profile_override:
        return [profile_override]
    raw = os.getenv("AUTOMATION_PROFILES", "")
    return [p.strip() for p in raw.split(",") if p.strip()]


def _warn_unconfigured_profiles(configured_profiles):
    """Log a warning if allele_profiles exist for profiles not in the run list."""
    try:
        from pymongo import MongoClient

        mongo_uri = os.getenv("MONGO_URI")
        db_name = os.getenv("MONGO_DB_NAME")
        if not mongo_uri or not db_name:
            return
        configured = set(configured_profiles)
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
        try:
            db = client[db_name]
            for doc in db["allele_profiles"].aggregate(
                [{"$group": {"_id": "$analysis_profile", "count": {"$sum": 1}}}]
            ):
                profile = doc.get("_id")
                count = doc.get("count", 0)
                if profile and profile not in configured:
                    log.warning(
                        "event=pending_samples_not_in_run profile=%s count=%d "
                        "hint=add_to_AUTOMATION_PROFILES_or_pass_profiles_to_trigger",
                        profile,
                        count,
                    )
        finally:
            client.close()
    except Exception as exc:
        log.debug("event=unconfigured_profile_check_failed reason=%s", exc)


def build_pipeline_argv(
    new_tsv_paths=None, profile_override=None, profiles_override=None
):
    profiles = _resolve_profiles(profile_override, profiles_override)

    argv = ["automation"]

    if profiles:
        argv.extend(["--profile", *profiles])

    if not _bonsai_enabled():
        argv.extend(["--bonsai", "false"])

    use_update_only = os.getenv("AUTOMATION_UPDATE_ONLY", "false").lower() == "true"
    use_re_cluster = os.getenv("AUTOMATION_RE_CLUSTER", "false").lower() == "true"

    if use_update_only and use_re_cluster:
        raise ValueError(
            "AUTOMATION_UPDATE_ONLY and AUTOMATION_RE_CLUSTER cannot both be true."
        )

    if use_update_only:
        argv.append("--update-only")
    elif use_re_cluster:
        argv.append("--re-cluster")

    raw_groups = os.getenv("AUTOMATION_GROUPS", "")
    groups = [g.strip() for g in raw_groups.split(",") if g.strip()]
    if groups:
        argv += ["--groups", *groups]

    if os.getenv("AUTOMATION_RUN_SIMILARITY", "false").lower() == "true":
        argv.append("--run-similarity")

    if new_tsv_paths:
        argv.extend(["--chewbbaca", *new_tsv_paths])

    return argv


def _send_failure_alert(error_message):
    """
    Send a pipeline failure alert to all opted-in users.
    """
    try:
        credentials = load_credentials(require_bonsai=_bonsai_enabled())
        upload_token = authenticate_mimosa_user(credentials)
        raw_profiles = os.getenv("AUTOMATION_PROFILES", "")
        profiles = [p.strip() for p in raw_profiles.split(",") if p.strip()]
        send_pipeline_alert(
            upload_token,
            errors=[error_message],
            profiles=profiles,
        )
    except Exception as alert_err:
        log.warning(f'event=alert_send_failed message="{alert_err}"')


def check_and_run(new_tsv_paths=None, profile_override=None, profiles_override=None):
    profiles = _resolve_profiles(profile_override, profiles_override)
    _warn_unconfigured_profiles(profiles)

    try:
        argv = build_pipeline_argv(new_tsv_paths, profile_override, profiles_override)
    except ValueError as e:
        log.error(f'event=config_error message="{e}"')
        return

    os.environ["MIMOSA_AUTOMATION_MODE"] = "true"
    sys.argv = argv

    max_retries = 2
    retry_delay = 30

    for attempt in range(max_retries):
        try:
            run_pipeline()
            return
        except SystemExit as e:
            code = str(e)
            if code != "0":
                log.error(f"event=pipeline_exit_error exit_code={code}")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                log.warning(
                    f'event=pipeline_retry attempt={attempt + 1} max={max_retries} retry_in={retry_delay}s message="{e}"'
                )
                time.sleep(retry_delay)
            else:
                log.error(
                    f'event=pipeline_failed attempts={max_retries} message="{e}"',
                    exc_info=True,
                )
                _send_failure_alert(str(e))


def _md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _scan_watch_dir(dir_path, profile, collection):
    from pathlib import Path as _Path

    dir_path = _Path(dir_path)
    tsv_files = list(dir_path.glob("*.tsv"))
    if not tsv_files:
        return

    file_hashes = {_md5(f): f for f in tsv_files}
    seen = {
        doc["md5"]
        for doc in collection.find({"md5": {"$in": list(file_hashes)}}, {"md5": 1})
    }
    new_file_map = {md5: path for md5, path in file_hashes.items() if md5 not in seen}
    skipped = len(file_hashes) - len(new_file_map)
    if skipped:
        log.info(
            "event=watch_skip reason=already_processed profile=%s count=%d",
            profile,
            skipped,
        )
    if new_file_map:
        new_files = [str(p) for p in new_file_map.values()]
        log.info("event=watch_trigger profile=%s files=%d", profile, len(new_files))
        with _pipeline_lock:
            check_and_run(new_tsv_paths=new_files, profile_override=profile)
        now = time.time()
        collection.insert_many(
            [
                {
                    "filename": _Path(p).name,
                    "md5": md5,
                    "profile": profile,
                    "processed_at": now,
                }
                for md5, p in new_file_map.items()
            ]
        )


def _watch_directory(db):
    config_path = os.getenv("CHEWBBACA_WATCH_CONFIG")
    interval_hours = float(os.getenv("CHEWBBACA_WATCH_INTERVAL", "24"))
    interval_seconds = interval_hours * 3600
    collection = db["processed_files"]

    try:
        with open(config_path) as f:
            raw = json.load(f)
    except Exception as e:
        log.error("event=watch_config_error path=%s error=%s", config_path, e)
        return

    config = {
        profile: ([dirs] if isinstance(dirs, str) else dirs)
        for profile, dirs in raw.items()
    }

    log.info(
        "event=watch_start profiles=%d interval_hours=%.4g", len(config), interval_hours
    )

    while True:
        try:
            for profile, dirs in config.items():
                for dir_path in dirs:
                    _scan_watch_dir(dir_path, profile, collection)
        except Exception as e:
            log.warning("event=watch_error error=%s", e)

        time.sleep(interval_seconds)


def main():
    schedule_hours = float(os.getenv("AUTOMATION_SCHEDULE_HOURS", "1"))
    run_on_startup = os.getenv("AUTOMATION_RUN_ON_STARTUP", "false").lower() == "true"

    log.info(f"event=automation_start schedule_hours={schedule_hours}")

    threading.Thread(target=_start_trigger_server, daemon=True).start()

    watch_config = os.getenv("CHEWBBACA_WATCH_CONFIG")
    if watch_config:
        from pymongo import MongoClient

        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            log.warning("event=watch_disabled reason=MONGO_URI_not_set")
        else:
            client = MongoClient(mongo_uri)
            db = client[os.getenv("MONGO_DB_NAME")]
            threading.Thread(target=_watch_directory, args=(db,), daemon=True).start()

    if run_on_startup:
        wait_for_backend()
        _safe_check_and_run()

    while True:
        time.sleep(schedule_hours * 3600)
        _safe_check_and_run()


if __name__ == "__main__":
    main()
