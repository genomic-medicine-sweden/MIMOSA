#!/usr/bin/env python3

import logging
import os
import sys
import time

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


def build_pipeline_argv():
    raw_profiles = os.getenv("AUTOMATION_PROFILES", "")
    profiles = [p.strip() for p in raw_profiles.split(",") if p.strip()]

    argv = ["automation"]

    if profiles:
        argv.extend(["--profile", *profiles])

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

    return argv


def _send_failure_alert(error_message):
    """Send a pipeline failure alert to all opted-in users."""
    try:
        credentials = load_credentials()
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


def check_and_run():
    try:
        argv = build_pipeline_argv()
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


def main():
    schedule_hours = float(os.getenv("AUTOMATION_SCHEDULE_HOURS", "1"))
    run_on_startup = os.getenv("AUTOMATION_RUN_ON_STARTUP", "false").lower() == "true"

    log.info(f"event=automation_start schedule_hours={schedule_hours}")

    if run_on_startup:
        wait_for_backend()
        check_and_run()

    while True:
        time.sleep(schedule_hours * 3600)
        check_and_run()


if __name__ == "__main__":
    main()
