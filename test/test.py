#!/usr/bin/env python3
import sys
import os
import argparse
import tempfile
import json
from dotenv import load_dotenv, find_dotenv
from datetime import datetime, timezone

from upload import upload_features, upload_clustering, upload_similarity,upload_distance
from api import load_credentials, authenticate_mimosa_user

dotenv_path = find_dotenv(filename=".env", usecwd=True)
if not dotenv_path:
    raise FileNotFoundError("Could not find project-root .env file.")
load_dotenv(dotenv_path)

SCRIPT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts"))
sys.path.insert(0, SCRIPT_DIR)

def load_test_data():
    data_path = os.path.join(os.path.dirname(__file__), "test_data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_temp_json(data):
    temp = tempfile.NamedTemporaryFile(delete=False, mode='w', suffix='.json')
    json.dump(data, temp, indent=2, ensure_ascii=False)
    temp.close()
    return temp.name

def parse_args():
    parser = argparse.ArgumentParser(description="Test uploads to MIMOSA. ")
    parser.add_argument(
        "--credentials",
        required=True,
        help="Path to credentials file for authentication"
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete test entries"
    )
    return parser.parse_args()

def delete_test_data(test_data):
    from pymongo import MongoClient

    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")

    client = MongoClient(mongo_uri)
    db = client[db_name]

    sample_ids = {item["properties"]["ID"] for item in test_data["features"]}
    profiles = {item["properties"]["analysis_profile"] for item in test_data["features"]} 

    for sample_id in sample_ids:
        print(f"Deleting entries for sample: {sample_id}")
        db["features"].delete_many({"properties.ID": sample_id})
        db["clustering"].delete_many({"ID": sample_id})
        db["similarities"].delete_many({"ID": sample_id})

    for profile in profiles:
        db["distance"].delete_many({"analysis_profile": profile})

    print("Deletion completed.")
    client.close()

def main():
    args = parse_args()
    test_data = load_test_data()

    if args.delete:
        delete_test_data(test_data)
        return

    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    if "clustering" in test_data:
        test_data["clustering"]["createdAt"] = now_iso
        for r in test_data["clustering"].get("results", []):
            r["createdAt"] = now_iso

    for s in test_data.get("similarity", []):
        s["createdAt"] = now_iso

    for d in test_data.get("distance", []):
        d["createdAt"] = now_iso


    credentials = load_credentials(args.credentials)
    upload_token = authenticate_mimosa_user(credentials)

    features_file = write_temp_json(test_data["features"])
    clustering_file = write_temp_json(test_data["clustering"])
    similarity_file = write_temp_json(test_data["similarity"])
    distance_file = write_temp_json(test_data["distance"][0])

    print("Uploading test features...")
    upload_features(
        data_file_path=features_file,
        overwrite=True,
        show_log=True,
        upload_token=upload_token
    )

    print("\nUploading test clustering...")
    upload_clustering(
        data_file_path=clustering_file,
        upload_token=upload_token
    )

    print("\nUploading test similarity...")
    upload_similarity(
        data_file_path=similarity_file,
        upload_token=upload_token
    )

    print("\nUploading test distance...")
    upload_distance(
        data_file_path=distance_file,
        upload_token=upload_token
    )

    print("\nTest upload script completed.")


if __name__ == "__main__":
    main()

