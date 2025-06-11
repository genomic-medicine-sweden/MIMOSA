import datetime

def log_sample_event(db, sample_id, profile, is_insert=False, changes_dict=None):
    """
    Insert or update a sample entry in the 'update_logs' collection.

    - is_insert=True: adds the initial 'added_at' timestamp if not present.
    - changes_dict: a dict of changed fields (field → {old, new}).
    """
    collection = db["logs"]
    now = datetime.datetime.utcnow().isoformat()

    existing = collection.find_one({"sample_id": sample_id})

    # First-time insert: create the document
    if not existing and is_insert:
        doc = {
            "sample_id": sample_id,
            "profile": profile,
            "added_at": now,
            "updates": []
        }
        collection.insert_one(doc)

    # Record update if changes exist
    if changes_dict:
        update_entry = {
            "date": now,
            "updated_fields": list(changes_dict.keys()),
            "changes": changes_dict
        }

        if existing:
            collection.update_one(
                {"_id": existing["_id"]},
                {"$push": {"updates": update_entry}}
            )
        else:
            # Sample wasn't logged yet — create full document now
            doc = {
                "sample_id": sample_id,
                "profile": profile,
                "added_at": now,
                "updates": [update_entry]
            }
            collection.insert_one(doc)
