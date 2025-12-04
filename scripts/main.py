#!/usr/bin/env python3
import argparse
import os
import json
import tempfile
import shutil
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient

from api import (
    load_credentials,
    get_access_token,
    fetch_samples,
    authenticate_mimosa_user
)
from upload import upload_similarity
from process_tsv import process_tsv, process_cluster_composition
from update_metadata import update_metadata_with_supplementary_metadata
from sample_checks import get_new_sample_ids, prompt_if_no_new_samples
from MIMOSA import mimosa

dotenv_path = find_dotenv(filename=".env", usecwd=True)
if not dotenv_path:
    raise FileNotFoundError("Could not find project-root .env file.")
load_dotenv(dotenv_path)

AVAILABLE_PROFILES = ["staphylococcus_aureus"]

def parse_args():
    parser = argparse.ArgumentParser(description="Process sample data, run ReporTree, and upload results to MIMOSA.")
    parser.add_argument("--credentials", required=True, help="Path to credentials file.")
    parser.add_argument("--profile", required=True, nargs="+", help="Target profile(s) to process. Pass 'All' to process all.")
    parser.add_argument("--output", required=False, help="Directory for output files.")
    parser.add_argument("--supplementary_metadata", required=False, help="Path to supplementary metadata.")
    parser.add_argument("--save_files", action="store_true", help="Save output files locally.")
    parser.add_argument("--update", action="store_true", help="Update existing samples with new Bonsai and metadata info.")
    parser.add_argument("--debug", action="store_true", required=False, help="Print full traceback for errors.")
    args = parser.parse_args()

    if args.save_files and not args.output:
        parser.error("--save_files requires --output to be set.")

    if "All" in args.profile:
        target_profiles = AVAILABLE_PROFILES
    else:
        target_profiles = [p for p in args.profile if p in AVAILABLE_PROFILES]

    if not target_profiles:
        print("No valid profiles selected. Exiting.")
        exit(1)

    return args, target_profiles

def get_analyzed_sample_ids():
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGO_URI_DOCKER")
    db_name = os.getenv("MONGO_DB_NAME")

    client = MongoClient(mongo_uri)
    db = client[db_name]
    ids = db["similarities"].distinct("ID")
    client.close()
    return set(ids)

def main():
    args, target_profiles = parse_args()
    credentials = load_credentials(args.credentials)
    token = get_access_token(credentials)
    upload_token = authenticate_mimosa_user(credentials)  

    base_dir = args.output if args.save_files else tempfile.mkdtemp(prefix="mimosa_tmp_")
    if args.save_files:
        os.makedirs(base_dir, exist_ok=True)

    try:
        all_samples = fetch_samples(credentials["bonsai_api_url"], token)
        analyzed_ids = get_analyzed_sample_ids()

        for profile in target_profiles:
            qc_only = False
            if args.update:
                target_ids = {
                    s["sample_id"] for s in all_samples
                    if s.get("profile") == profile and s.get("sample_id") in analyzed_ids
                }
                if not target_ids:
                    print(f"No existing samples to update for profile '{profile}'.")
                    continue
            else:
                new_ids = get_new_sample_ids(all_samples, analyzed_ids, profile)

                if not new_ids:
                    if prompt_if_no_new_samples(profile, new_ids):
                        target_ids = analyzed_ids
                        qc_only = False
                    else:
                        continue
                else:
                    target_ids = new_ids
                    qc_only = False

            profile_dir = os.path.join(base_dir, profile)
            mimosa(profile, profile_dir, args, credentials, token, target_ids, upload_token)

    finally:
        if not args.save_files and os.path.exists(base_dir):
            shutil.rmtree(base_dir, ignore_errors=True)

if __name__ == "__main__":
    args, _ = parse_args()
    try:
        main()
    except Exception as e:
        if args.debug:
            raise
        else:
            print(f"{type(e).__name__}: {e}. For more information, try again with --debug.")
            exit(1)

