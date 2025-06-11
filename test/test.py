#!/usr/bin/env python3
import sys
import os
import argparse
import tempfile
import json
import requests
from urllib.parse import urljoin

SCRIPT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "scripts"))
sys.path.insert(0, SCRIPT_DIR)

from upload import upload_features, upload_clustering, upload_similarity

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
    parser = argparse.ArgumentParser(description="Test uploads to MIMOSA models.")
    parser.add_argument(
        "--config",
        default="config.json",
        help="Path to MIMOSA config file (default: config.json)"
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete test entries instead of uploading"
    )
    return parser.parse_args()

def delete_test_data(config_path, test_data):
    from pymongo import MongoClient

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    mongo_uri = config.get("MONGO_URI")
    db_name = config.get("MONGO_DB_NAME")

    client = MongoClient(mongo_uri)
    db = client[db_name]

    sample_ids = {item["properties"]["ID"] for item in test_data["features"]}

    for sample_id in sample_ids:
        print(f"Deleting entries for sample: {sample_id}")
        db["features"].delete_many({"properties.ID": sample_id})
        db["clustering"].delete_many({"ID": sample_id})
        db["similarities"].delete_many({"ID": sample_id})

    print("Deletion completed.")
    client.close()

def main():
    args = parse_args()
    test_data = load_test_data()

    if args.delete:
        delete_test_data(args.config, test_data)
        return

    features_file = write_temp_json(test_data["features"])
    clustering_file = write_temp_json(test_data["clustering"])
    similarity_file = write_temp_json(test_data["similarity"])

    print("Uploading test features...")
    upload_features(args.config, features_file, overwrite=True, show_log=True)

    print("\nUploading test clustering...")
    upload_clustering(args.config, clustering_file)

    print("\nUploading test similarity...")
    upload_similarity(args.config, similarity_file)

    print("\nTest upload script completed.")

if __name__ == "__main__":
    main()

