#!/usr/bin/env python3
"""
Test script for the MIMOSA chewBBACA test dataset (staphylococcus_aureus).

Run the full pipeline with the test data:
    python test/mimosa_chewbbaca_test.py --credentials credentials.json

Delete the test samples from MongoDB afterwards:
    python test/mimosa_chewbbaca_test.py --credentials credentials.json --delete
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = REPO_ROOT / "scripts"
TEST_DIR = Path(__file__).resolve().parent

PROFILE = "staphylococcus_aureus"
TSV_FILE = TEST_DIR / "MIMOSA_test_results_alleles.tsv"
METADATA_FILE = TEST_DIR / "MIMOSA_test_Metadata.csv"

sys.path.insert(0, str(SCRIPT_DIR))

from dotenv import load_dotenv

load_dotenv(REPO_ROOT / ".env")


def get_sample_ids():
    with open(TSV_FILE, encoding="utf-8") as f:
        lines = f.readlines()
    return [line.split("\t")[0] for line in lines[1:] if line.strip()]


def run_pipeline(credentials_path):
    cmd = [
        sys.executable,
        str(SCRIPT_DIR / "main.py"),
        "--credentials",
        credentials_path,
        "--chewbbaca",
        str(TSV_FILE),
        "--profile",
        PROFILE,
        "--bonsai",
        "false",
        "--supplementary_metadata",
        str(METADATA_FILE),
    ]
    print("Running:", " ".join(str(c) for c in cmd), flush=True)
    subprocess.run(cmd, check=True)


def delete_samples(sample_ids):
    from pymongo import MongoClient

    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    if not mongo_uri:
        raise SystemExit("MONGO_URI is not set in .env")

    client = MongoClient(mongo_uri)
    db = client[db_name]

    print(
        f"Deleting {len(sample_ids)} test samples (profile: {PROFILE})...", flush=True
    )

    r = db["allele_profiles"].delete_many(
        {"sample_id": {"$in": sample_ids}, "analysis_profile": PROFILE}
    )
    print(f"  allele_profiles: {r.deleted_count} deleted")

    r = db["features"].delete_many({"properties.ID": {"$in": sample_ids}})
    print(f"  features: {r.deleted_count} deleted")

    r = db["clustering"].update_many(
        {"analysis_profile": PROFILE},
        {"$pull": {"results": {"ID": {"$in": sample_ids}}}},
    )
    print(f"  clustering: {r.modified_count} document(s) updated")

    r = db["clustering"].delete_many(
        {"analysis_profile": PROFILE, "results": {"$size": 0}}
    )
    if r.deleted_count:
        print(f"  clustering: {r.deleted_count} empty document(s) removed")

    print("Done.", flush=True)
    client.close()


def main():
    parser = argparse.ArgumentParser(
        description="Run or clean up the MIMOSA chewBBACA test dataset."
    )
    parser.add_argument(
        "--credentials", required=True, help="Path to credentials JSON file"
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete demo samples from MongoDB instead of running the pipeline",
    )
    args = parser.parse_args()

    if args.delete:
        delete_samples(get_sample_ids())
    else:
        run_pipeline(args.credentials)


if __name__ == "__main__":
    main()
