#!/usr/bin/env python3
import json
import os
import requests
from pymongo import MongoClient
from dotenv import load_dotenv, find_dotenv
from log_updates import log_sample_event
from requests.exceptions import RequestException

dotenv_path = find_dotenv(filename=".env", usecwd=True)
if not dotenv_path:
    raise FileNotFoundError("Could not find project-root .env file.")
load_dotenv(dotenv_path)

mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGO_URI_DOCKER")
db_name = os.getenv("MONGO_DB_NAME")
mimosa_domain = os.getenv("DOMAIN")
backend_port = os.getenv("BACKEND_PORT")

def validate_upload_token(token):
    """
    Validate that the provided token corresponds to an actual user in MIMOSA.
    """
    try:
        resp = requests.get(
            f"http://{mimosa_domain}:{backend_port}/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        resp.raise_for_status()
        return resp.json().get("email")
    except RequestException as e:
        raise RuntimeError(f"Authentication failed: {e}")

def upload_features(data_file_path, overwrite=False, show_log=False, upload_token=None):
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    validate_upload_token(upload_token)
    uploader_email = validate_upload_token(upload_token)


    try:
        with open(data_file_path, 'r') as file:
            data_to_upload = json.load(file)
    except Exception as error:
        print('Error loading data file:', error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['features']

    updated_count = 0
    uploaded_count = 0

    def get_changed_fields(existing, new):
        changed = []
        old = existing.get("properties", {})
        new = new.get("properties", {})
        for key in new:
            if key == "typing":
                old_typing = old.get("typing", {})
                new_typing = new.get("typing", {})
                if old_typing.get("ST") != new_typing.get("ST"):
                    changed.append("ST")
                if "alleles" in new_typing:
                    old_alleles = old_typing.get("alleles", {})
                    for allele_key, allele_val in new_typing["alleles"].items():
                        if old_alleles.get(allele_key) != allele_val:
                            changed.append(allele_key)
            else:
                if old.get(key) != new.get(key):
                    changed.append(key)
        return changed

    def upload_data(data):
        nonlocal updated_count, uploaded_count
        for item in data:
            sample_id = item["properties"]["ID"]
            existing = collection.find_one({"properties.ID": sample_id})
            new_props = item.get("properties", {})
            if existing:
                old_props = existing.get("properties", {})
                old_qc = old_props.get("QC_Status")
                new_qc = new_props.get("QC_Status")
                if old_qc != new_qc:
                    collection.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {"properties.QC_Status": new_qc}}
                    )
                    if show_log:
                        print(f"Updated QC_Status for Sample with ID {sample_id}")
                    log_sample_event(
                        db,
                        sample_id,
                        new_props.get("analysis_profile"),
                        changes_dict={"QC_Status": {"old": old_qc, "new": new_qc}},
                        changed_by="bonsai"
                    )
                if overwrite:
                    changed_fields = get_changed_fields(existing, item)
                    if changed_fields:
                        collection.replace_one({"_id": existing["_id"]}, item)
                        updated_count += 1
                        diff_dict = {}
                        for field in changed_fields:
                            if field == "ST":
                                old_val = old_props.get("typing", {}).get("ST")
                                new_val = new_props.get("typing", {}).get("ST")
                            elif field in new_props.get("typing", {}).get("alleles", {}):
                                old_val = old_props.get("typing", {}).get("alleles", {}).get(field)
                                new_val = new_props.get("typing", {}).get("alleles", {}).get(field)
                            else:
                                old_val = old_props.get(field)
                                new_val = new_props.get(field)
                            diff_dict[field] = {"old": old_val, "new": new_val}
                        log_sample_event(db, sample_id, new_props.get("analysis_profile"), changes_dict=diff_dict,changed_by=uploader_email)
                        if show_log:
                            changes = ", ".join(sorted(changed_fields))
                            print(f"Sample with ID {sample_id} updated with {changes}")
            else:
                collection.insert_one(item)
                uploaded_count += 1
                print(f"Sample with ID {sample_id} uploaded successfully!")
                log_sample_event(db, sample_id, new_props.get("analysis_profile"), is_insert=True,changed_by=uploader_email)

    try:
        upload_data(data_to_upload)
    except Exception as err:
        print('Error uploading data:', err)
    finally:
        client.close()

    if overwrite and show_log and updated_count == 0 and uploaded_count == 0:
        print("No samples were updated or uploaded.")

def upload_clustering(data_file_path, upload_token=None):
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    validate_upload_token(upload_token)

    try:
        with open(data_file_path, 'r') as file:
            clustering_data = json.load(file)
    except Exception as error:
        print("Error loading clustering data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['clustering']

    try:
        collection.insert_one(clustering_data)
        print("Clustering result uploaded successfully!")
    except Exception as err:
        print("Error uploading clustering data:", err)
    finally:
        client.close()

def upload_similarity(data_file_path, upload_token=None):
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    validate_upload_token(upload_token)

    try:
        with open(data_file_path, 'r') as file:
            similarity_data = json.load(file)
    except Exception as error:
        print("Error loading similarity data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['similarities']

    try:
        for item in similarity_data:
            collection.insert_one(item)
            print(f"Similarity data for ID {item['ID']} uploaded successfully!")
    except Exception as err:
        print("Error uploading similarity data:", err)
    finally:
        client.close()

