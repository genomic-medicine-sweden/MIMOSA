#!/usr/bin/env python3

import logging
import os
import sys
import time

import requests as http_requests
from dotenv import load_dotenv
from pathlib import Path

from main import main as run_pipeline

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [automation] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def wait_for_backend(timeout=300, interval=5):
    base_url = os.getenv("MIMOSA_API_INTERNAL", "http://mimosa-backend:5000")
    url = f"{base_url}/api/users/me"

    log.info("Waiting for backend to be ready...")
    elapsed = 0

    while elapsed < timeout:
        try:
            http_requests.get(url, timeout=3)
            log.info("Backend is ready.")
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


def check_and_run():
    log.info("Starting scheduled pipeline run...")

    try:
        argv = build_pipeline_argv()
    except ValueError as e:
        log.error(f"Configuration error: {e}")
        return

    os.environ["MIMOSA_AUTOMATION_MODE"] = "true"
    sys.argv = argv

    max_retries = 2
    retry_delay = 30

    for attempt in range(max_retries):
        try:
            run_pipeline()
            log.info("Pipeline completed successfully.")
            return
        except SystemExit as e:
            code = str(e)
            if code != "0":
                log.error(f"Pipeline exited with code: {code}")
            return
        except Exception as e:
            if attempt < max_retries - 1:
                log.warning(
                    f"Attempt {attempt + 1}/{max_retries} failed: {e}. Retrying in {retry_delay}s..."
                )
                time.sleep(retry_delay)
            else:
                log.error(
                    f"Pipeline failed after {max_retries} attempts: {e}", exc_info=True
                )


def main():
    schedule_hours = float(os.getenv("AUTOMATION_SCHEDULE_HOURS", "1"))
    run_on_startup = os.getenv("AUTOMATION_RUN_ON_STARTUP", "false").lower() == "true"

    log.info(f"MIMOSA automation starting. Schedule: every {schedule_hours} hour(s).")

    if run_on_startup:
        wait_for_backend()
        check_and_run()

    while True:
        time.sleep(schedule_hours * 3600)
        check_and_run()


if __name__ == "__main__":
    main()
