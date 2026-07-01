#!/usr/bin/env python3
import json
import os
import sys
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
from log_updates import log_sample_event, log_batch_deletion
from requests.exceptions import RequestException

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI is not set")

db_name = os.getenv("MONGO_DB_NAME")
mimosa_domain = os.getenv("DOMAIN")
backend_port = os.getenv("BACKEND_PORT")


def _resolve_actor(email):
    return "automation" if not sys.stdin.isatty() else email


def validate_upload_token(token):
    mimosa_api_base = (
        os.getenv("MIMOSA_API_PRIVATE_URL_BASE")
        or f"http://{mimosa_domain}:{backend_port}"
    )

    try:
        resp = requests.get(
            f"{mimosa_api_base}/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("email")
    except RequestException as e:
        raise RuntimeError(f"Authentication failed: {e}")


def upload_features(data_file_path, overwrite=False, show_log=False, upload_token=None):
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    uploader_email = validate_upload_token(upload_token)
    log_actor = _resolve_actor(uploader_email)

    try:
        with open(data_file_path, "r", encoding="utf-8") as file:
            data_to_upload = json.load(file)
    except Exception as error:
        print("Error loading data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db["features"]

    updated_count = 0
    uploaded_count = 0

    PROTECTED_FIELDS = {"Hospital", "PostCode", "Date"}

    def get_changed_fields(existing, new):
        changed = []
        old = existing.get("properties", {})
        new_props = new.get("properties", {})
        for key in new_props:
            if key == "typing":
                old_typing = old.get("typing", {})
                new_typing = new_props.get("typing", {})
                if old_typing.get("ST") != new_typing.get("ST"):
                    changed.append("ST")
                if "alleles" in new_typing:
                    old_alleles = old_typing.get("alleles", {})
                    for allele_key, allele_val in new_typing["alleles"].items():
                        if old_alleles.get(allele_key) != allele_val:
                            changed.append(allele_key)
            else:
                if old.get(key) != new_props.get(key):
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
                        {"$set": {"properties.QC_Status": new_qc}},
                    )
                    log_sample_event(
                        db,
                        sample_id,
                        new_props.get("analysis_profile"),
                        changes_dict={"QC_Status": {"old": old_qc, "new": new_qc}},
                        changed_by="bonsai",
                    )
                    updated_count += 1

                if overwrite:
                    changed_fields = [
                        f
                        for f in get_changed_fields(existing, item)
                        if f != "QC_Status"
                    ]

                    if changed_fields:
                        selective_set = {}
                        skipped_fields = []

                        for field in changed_fields:
                            if field in PROTECTED_FIELDS and old_props.get(field):
                                skipped_fields.append(field)
                                continue
                            if field == "ST":
                                selective_set["properties.typing.ST"] = new_props.get(
                                    "typing", {}
                                ).get("ST")
                            elif field in new_props.get("typing", {}).get(
                                "alleles", {}
                            ):
                                selective_set[f"properties.typing.alleles.{field}"] = (
                                    new_props.get("typing", {})
                                    .get("alleles", {})
                                    .get(field)
                                )
                            else:
                                selective_set[f"properties.{field}"] = new_props.get(
                                    field
                                )

                        if selective_set:
                            collection.update_one(
                                {"_id": existing["_id"]},
                                {"$set": selective_set},
                            )
                            updated_count += 1

                            logged_fields = [
                                f for f in changed_fields if f not in skipped_fields
                            ]
                            if logged_fields:
                                diff_dict = {}
                                for field in logged_fields:
                                    if field == "ST":
                                        old_val = old_props.get("typing", {}).get("ST")
                                        new_val = new_props.get("typing", {}).get("ST")
                                    elif field in new_props.get("typing", {}).get(
                                        "alleles", {}
                                    ):
                                        old_val = (
                                            old_props.get("typing", {})
                                            .get("alleles", {})
                                            .get(field)
                                        )
                                        new_val = (
                                            new_props.get("typing", {})
                                            .get("alleles", {})
                                            .get(field)
                                        )
                                    else:
                                        old_val = old_props.get(field)
                                        new_val = new_props.get(field)

                                    diff_dict[field] = {"old": old_val, "new": new_val}

                                log_sample_event(
                                    db,
                                    sample_id,
                                    new_props.get("analysis_profile"),
                                    changes_dict=diff_dict,
                                    changed_by=log_actor,
                                )
            else:
                collection.insert_one(item)
                uploaded_count += 1
                log_sample_event(
                    db,
                    sample_id,
                    new_props.get("analysis_profile"),
                    is_insert=True,
                    changed_by=log_actor,
                )

    try:
        upload_data(data_to_upload)
    except Exception as err:
        print("Error uploading data:", err)
    finally:
        client.close()

    if overwrite and show_log:
        if uploaded_count > 0:
            print(f"Uploaded {uploaded_count} new sample(s).")
        if updated_count > 0:
            print(f"Updated {updated_count} sample(s).")
        if uploaded_count == 0 and updated_count == 0:
            print("No samples were updated or uploaded.")


def upload_clustering(data_file_path, upload_token=None):
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    validate_upload_token(upload_token)

    try:
        with open(data_file_path, "r", encoding="utf-8") as file:
            clustering_data = json.load(file)
    except Exception as error:
        print("Error loading clustering data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db["clustering"]

    try:
        collection.insert_one(clustering_data)
        print("Clustering result uploaded successfully!")
    except Exception as err:
        print("Error uploading clustering data:", err)
    finally:
        client.close()


def upload_distance(data_file_path, upload_token=None):
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    validate_upload_token(upload_token)

    try:
        with open(data_file_path, "r", encoding="utf-8") as file:
            distance_data = json.load(file)
    except Exception as error:
        print("Error loading distance data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db["distance"]

    try:
        collection.update_one(
            {"analysis_profile": distance_data.get("analysis_profile")},
            {"$set": distance_data},
            upsert=True,
        )
        print(f"Distance data stored for {distance_data.get('analysis_profile')}")
    except Exception as err:
        print("Error uploading distance data:", err)
    finally:
        client.close()


def delete_features(sample_ids, profile, upload_token=None):
    """
    Remove samples from features and their chewBBACA allele profiles.
    Used for both QC-excluded samples and explicit admin deletions.
    """
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    uploader_email = validate_upload_token(upload_token)
    log_actor = _resolve_actor(uploader_email)

    if not sample_ids:
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db["features"]

    try:
        filenames = {
            doc["filename"]
            for doc in db["allele_profiles"].find(
                {"sample_id": {"$in": list(sample_ids)}, "source": "chewbbaca"},
                {"filename": 1},
            )
            if doc.get("filename")
        }

        result = collection.delete_many(
            {
                "properties.ID": {"$in": list(sample_ids)},
                "properties.analysis_profile": profile,
            }
        )
        db["allele_profiles"].delete_many(
            {"sample_id": {"$in": list(sample_ids)}, "source": "chewbbaca"}
        )

        if filenames:
            db["processed_files"].delete_many(
                {"filename": {"$in": list(filenames)}, "profile": profile}
            )

        if result.deleted_count:
            print(
                f"[{profile}] Removed {result.deleted_count} QC-excluded sample(s) from features."
            )
            log_batch_deletion(db, sample_ids, profile, deleted_by=log_actor)
    except Exception as err:
        print(f"[{profile}] Error deleting features: {err}")
    finally:
        client.close()


def save_excluded_samples_to_db(sample_ids, added_by="cli"):
    """
    Upsert sample IDs into excluded_samples, looking up each sample's profile from features.
    """
    from datetime import datetime, timezone

    client = MongoClient(mongo_uri)
    db = client[db_name]
    try:
        saved = 0
        for sid in sample_ids:
            feature = db["features"].find_one(
                {"properties.ID": sid}, {"properties.analysis_profile": 1}
            )
            if not feature:
                continue
            profile = (feature.get("properties") or {}).get(
                "analysis_profile", "unknown"
            )
            db["excluded_samples"].update_one(
                {"sample_id": sid, "profile": profile},
                {
                    "$setOnInsert": {
                        "sample_id": sid,
                        "profile": profile,
                        "added_at": datetime.now(timezone.utc),
                        "added_by": added_by,
                    }
                },
                upsert=True,
            )
            saved += 1
        if saved:
            print(f"Saved {saved} sample(s) to excluded_samples DB.")
    finally:
        client.close()


def save_excluded_groups_to_db(group_ids, added_by="cli"):
    """
    Upsert group IDs into excluded_groups.
    """
    from datetime import datetime, timezone

    client = MongoClient(mongo_uri)
    db = client[db_name]
    try:
        for gid in group_ids:
            db["excluded_groups"].update_one(
                {"group_id": gid},
                {
                    "$setOnInsert": {
                        "group_id": gid,
                        "added_at": datetime.now(timezone.utc),
                        "added_by": added_by,
                    }
                },
                upsert=True,
            )
        print(f"Saved {len(group_ids)} group(s) to excluded_groups DB.")
    finally:
        client.close()


def fetch_excluded_sample_ids(profiles):
    """
    Return set of sample_ids excluded for any of the given profiles.
    """
    client = MongoClient(mongo_uri)
    db = client[db_name]
    try:
        query = {"profile": {"$in": list(profiles)}} if profiles else {}
        return {
            doc["sample_id"]
            for doc in db["excluded_samples"].find(query, {"sample_id": 1})
        }
    finally:
        client.close()


def fetch_excluded_group_ids():
    """
    Return set of group_ids in the excluded_groups collection.
    """
    client = MongoClient(mongo_uri)
    db = client[db_name]
    try:
        return {
            doc["group_id"] for doc in db["excluded_groups"].find({}, {"group_id": 1})
        }
    finally:
        client.close()


def upload_similarity(data_file_path, upload_token=None):
    if not upload_token:
        raise RuntimeError("upload_token is required for authenticated upload.")
    validate_upload_token(upload_token)

    try:
        with open(data_file_path, "r", encoding="utf-8") as file:
            similarity_data = json.load(file)
    except Exception as error:
        print("Error loading similarity data file:", error)
        return

    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db["similarities"]

    try:
        for item in similarity_data:
            if "ID" not in item:
                continue
            collection.replace_one(
                {"ID": item["ID"]},
                item,
                upsert=True,
            )
            print(f"Similarity data for ID {item['ID']} uploaded successfully!")
    except Exception as err:
        print("Error uploading similarity data:", err)
    finally:
        client.close()
