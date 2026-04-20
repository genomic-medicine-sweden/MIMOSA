#!/usr/bin/env python3

import io
import logging
import os
import shutil
import sys
import time

import requests as http_requests
from dotenv import load_dotenv
from pathlib import Path

from api import load_credentials, get_access_token, fetch_samples
from main import main as run_pipeline, get_analyzed_sample_ids
from sample_checks import get_new_sample_ids

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [automation] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

OUTPUT_DIR = "/tmp/mimosa_automation"


def wait_for_backend(timeout=300, interval=5):
    """

    Poll the backend until it responds or timeout is reached.

    """
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


def get_target_profiles():
    raw = os.getenv("AUTOMATION_PROFILES", "")
    profiles = [p.strip() for p in raw.split(",") if p.strip()]

    if not profiles:
        raise ValueError("AUTOMATION_PROFILES must be set")

    return profiles


def clear_output_dir():
    """

    Clear contents of OUTPUT_DIR
    without deleting the directory itself.

    """
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        return

    for item in os.listdir(OUTPUT_DIR):
        item_path = os.path.join(OUTPUT_DIR, item)
        if os.path.isdir(item_path):
            shutil.rmtree(item_path)
        else:
            os.remove(item_path)


def check_and_run():
    log.info("Starting scheduled check for new samples...")
    log.info("Fetching samples from Bonsai...")

    try:
        credentials = load_credentials()
        token = get_access_token(credentials)

    except Exception as e:
        log.error(f"Authentication failed: {e}")
        return

    target_profiles = get_target_profiles()

    try:
        all_samples = fetch_samples(credentials["bonsai_api_url"], token)
    except Exception as e:
        log.error(f"Failed to fetch samples from Bonsai: {e}")
        return

    try:
        analyzed_ids = get_analyzed_sample_ids()
    except Exception as e:
        log.error(f"Failed to fetch analyzed sample IDs: {e}")
        return

    new_found = False

    for profile in target_profiles:
        new_ids = get_new_sample_ids(all_samples, analyzed_ids, profile)

        if new_ids:
            log.info(f"Found {len(new_ids)} new sample(s) for profile '{profile}'.")
            new_found = True
        else:
            log.info(f"No new samples for profile '{profile}'.")

    if not new_found:
        log.info("No new samples detected across any profile. Skipping pipeline run.")
        return

    log.info("New samples detected — starting pipeline...")

    clear_output_dir()

    sys.argv = [
        "automation",
        "--credentials",
        "",
        "--profile",
        *target_profiles,
        "--output",
        OUTPUT_DIR,
        "--save_files",
    ]

    buffer = io.StringIO()
    sys.stdout = buffer

    try:
        run_pipeline()
        sys.stdout = sys.__stdout__
        log.info("Pipeline run completed successfully.")

    except SystemExit as e:
        sys.stdout = sys.__stdout__
        if str(e) != "0":
            log.error(f"Pipeline exited with: {e}")
            log.debug("Pipeline output:\n" + buffer.getvalue())

    except Exception as e:
        sys.stdout = sys.__stdout__
        log.error(f"Pipeline run failed: {e}")
        log.debug("Pipeline output:\n" + buffer.getvalue())


def main():
    schedule_hours = int(os.getenv("AUTOMATION_SCHEDULE_HOURS", "1"))
    run_on_startup = os.getenv("AUTOMATION_RUN_ON_STARTUP", "false").lower() == "true"

    log.info(
        f"MIMOSA automation starting. Schedule: every {schedule_hours} hour(s) after each run."
    )
    log.info(f"Run on startup: {run_on_startup}")

    if run_on_startup:
        wait_for_backend()
        check_and_run()

    while True:
        time.sleep(schedule_hours * 3600)
        check_and_run()


if __name__ == "__main__":
    main()
