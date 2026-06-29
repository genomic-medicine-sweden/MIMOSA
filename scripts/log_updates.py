import datetime


def log_conflict_event(db, conflicts, triggered_by=None):
    """
    Record a chewBBACA conflict resolution batch in the logs collection.

    """
    if not conflicts:
        return

    profiles = sorted({c.get("profile", "") for c in conflicts if c.get("profile")})
    profile_str = ", ".join(profiles) if profiles else "unknown"

    db["logs"].insert_one(
        {
            "event": "chewbbaca_conflict",
            "profile": profile_str,
            "conflict_count": len(conflicts),
            "conflicts": conflicts,
            "added_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "triggered_by": triggered_by or "automation",
        }
    )


def log_batch_deletion(db, sample_ids, profile, deleted_by=None):
    """
    Record a single audit entry when a batch of QC-excluded samples is removed.
    """
    db["logs"].insert_one(
        {
            "event": "qc_deletion",
            "profile": profile,
            "deleted_count": len(sample_ids),
            "deleted_ids": sorted(sample_ids),
            "added_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "triggered_by": deleted_by or "automation",
        }
    )


def log_sample_event(
    db, sample_id, profile, is_insert=False, changes_dict=None, changed_by=None
):
    """
    Insert or update a sample entry in the 'logs' collection.
    """
    collection = db["logs"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    actor = changed_by or "automation"

    existing = collection.find_one({"sample_id": sample_id})

    if not existing and is_insert:
        doc = {
            "sample_id": sample_id,
            "profile": profile,
            "added_at": now,
            "updates": [],
        }
        collection.insert_one(doc)
        existing = collection.find_one({"sample_id": sample_id})

    if changes_dict:
        update_entry = {
            "date": now,
            "changed_by": actor,
            "updated_fields": list(changes_dict.keys()),
            "changes": changes_dict,
        }

        if existing:
            collection.update_one(
                {"_id": existing["_id"]}, {"$push": {"updates": update_entry}}
            )
        else:
            doc = {
                "sample_id": sample_id,
                "profile": profile,
                "added_at": now,
                "updates": [update_entry],
            }
            collection.insert_one(doc)
