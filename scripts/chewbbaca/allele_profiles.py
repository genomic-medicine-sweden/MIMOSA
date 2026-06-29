#!/usr/bin/env python3
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

COLLECTION_NAME = "allele_profiles"
SOURCE_CHEWBBACA = "chewbbaca"


class AlleleProfileError(Exception):
    pass


class DuplicateAlleleProfileError(AlleleProfileError):
    def __init__(self, sample_id, analysis_profile):
        super().__init__(
            f"Allele profile already exists for sample {sample_id} "
            f"and profile {analysis_profile}."
        )
        self.sample_id = sample_id
        self.analysis_profile = analysis_profile


class AlleleProfileNotFoundError(AlleleProfileError):
    def __init__(self, sample_id, analysis_profile):
        super().__init__(
            f"No allele profile exists for sample {sample_id} "
            f"and profile {analysis_profile}."
        )
        self.sample_id = sample_id
        self.analysis_profile = analysis_profile


def utc_now():
    return datetime.now(timezone.utc)


def load_environment():
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(env_path)


def get_allele_profile_collection(
    mongo_uri=None,
    db_name=None,
    collection_name=COLLECTION_NAME,
):
    load_environment()

    mongo_uri = mongo_uri or os.getenv("MONGO_URI")
    db_name = db_name or os.getenv("MONGO_DB_NAME")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set.")
    if not db_name:
        raise RuntimeError("MONGO_DB_NAME is not set.")

    from pymongo import MongoClient

    client = MongoClient(mongo_uri)
    collection = client[db_name][collection_name]
    ensure_indexes(collection)
    return client, collection


def ensure_indexes(collection):
    existing = collection.index_information()
    existing_keys = {tuple(info.get("key", [])) for info in existing.values()}

    sample_profile_key = (("sample_id", 1), ("analysis_profile", 1))
    if sample_profile_key not in existing_keys:
        collection.create_index(
            list(sample_profile_key),
            unique=True,
        )

    profile_sample_key = (("analysis_profile", 1), ("sample_id", 1))
    if profile_sample_key not in existing_keys:
        collection.create_index(list(profile_sample_key))


def normalise_alleles(alleles):
    normalised = {}
    for locus, allele in (alleles or {}).items():
        locus = str(locus).strip()
        if not locus:
            continue
        if allele is None:
            allele = "0"
        normalised[locus] = str(allele).strip()
    return normalised


def hash_alleles(alleles):
    payload = json.dumps(
        normalise_alleles(alleles),
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def find_allele_profile(collection, sample_id, analysis_profile):
    return collection.find_one(
        {
            "sample_id": sample_id,
            "analysis_profile": analysis_profile,
        }
    )


def allele_profile_exists(collection, sample_id, analysis_profile):
    return find_allele_profile(collection, sample_id, analysis_profile) is not None


def build_profile_document(
    sample_id,
    analysis_profile,
    alleles,
    filename,
    source=SOURCE_CHEWBBACA,
    now=None,
):
    now = now or utc_now()
    alleles = normalise_alleles(alleles)
    return {
        "sample_id": sample_id,
        "analysis_profile": analysis_profile,
        "alleles": alleles,
        "allele_hash": hash_alleles(alleles),
        "source": source,
        "filename": filename,
        "created_at": now,
        "imported_at": now,
        "updated_at": now,
        "replacement_history": [],
    }


def store_allele_profile(
    collection,
    sample_id,
    analysis_profile,
    alleles,
    filename,
    source=SOURCE_CHEWBBACA,
):
    if allele_profile_exists(collection, sample_id, analysis_profile):
        raise DuplicateAlleleProfileError(sample_id, analysis_profile)

    document = build_profile_document(
        sample_id,
        analysis_profile,
        alleles,
        filename,
        source=source,
    )
    collection.insert_one(document)
    return document


def overwrite_allele_profile(
    collection,
    sample_id,
    analysis_profile,
    alleles,
    filename,
    source=SOURCE_CHEWBBACA,
):
    existing = find_allele_profile(collection, sample_id, analysis_profile)
    if not existing:
        raise AlleleProfileNotFoundError(sample_id, analysis_profile)

    now = utc_now()
    alleles = normalise_alleles(alleles)
    replacement = {
        "replaced_at": now,
        "previous_filename": existing.get("filename"),
        "previous_imported_at": existing.get("imported_at"),
        "previous_allele_hash": existing.get("allele_hash"),
        "previous_source": existing.get("source"),
    }
    update = {
        "alleles": alleles,
        "allele_hash": hash_alleles(alleles),
        "source": source,
        "filename": filename,
        "imported_at": now,
        "updated_at": now,
    }
    collection.update_one(
        {
            "sample_id": sample_id,
            "analysis_profile": analysis_profile,
        },
        {
            "$set": update,
            "$push": {"replacement_history": replacement},
        },
    )
    return find_allele_profile(collection, sample_id, analysis_profile)


def delete_allele_profile(collection, sample_id, analysis_profile):
    """Delete a stored allele profile. Returns True if a document was deleted."""
    result = collection.delete_one(
        {"sample_id": sample_id, "analysis_profile": analysis_profile}
    )
    return result.deleted_count > 0


def load_allele_profiles(collection, analysis_profile, sample_ids=None):
    query = {"analysis_profile": analysis_profile}
    if sample_ids is not None:
        query["sample_id"] = {"$in": sorted(sample_ids)}
    return list(collection.find(query).sort("sample_id", 1))
