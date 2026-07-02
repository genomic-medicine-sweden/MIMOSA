#!/usr/bin/env python3
import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise RuntimeError("MONGO_URI is not set in .env")

db_name = os.getenv("MONGO_DB_NAME")


def get_db():
    client = MongoClient(mongo_uri)
    return client, client[db_name]


def cmd_list(_args):
    client, db = get_db()
    try:
        samples = list(
            db["excluded_samples"]
            .find(
                {},
                {"_id": 0, "sample_id": 1, "profile": 1, "added_at": 1, "added_by": 1},
            )
            .sort("added_at", -1)
        )
        groups = list(
            db["excluded_groups"]
            .find({}, {"_id": 0, "group_id": 1, "added_at": 1, "added_by": 1})
            .sort("added_at", -1)
        )
    finally:
        client.close()

    if samples:
        print(f"\nExcluded samples ({len(samples)}):")
        print(f"  {'Sample ID':<30} {'Profile':<30} {'Added':<22} {'Added by'}")
        print(f"  {'-'*28:<30} {'-'*28:<30} {'-'*20:<22} {'-'*20}")
        for s in samples:
            added = s.get("added_at")
            added_str = (
                added.strftime("%Y-%m-%d %H:%M")
                if isinstance(added, datetime)
                else str(added)[:16]
            )
            print(
                f"  {s['sample_id']:<30} {s.get('profile', ''):<30} {added_str:<22} {s.get('added_by', '')}"
            )
    else:
        print("\nNo excluded samples.")

    if groups:
        print(f"\nExcluded groups ({len(groups)}):")
        print(f"  {'Group ID':<40} {'Added':<22} {'Added by'}")
        print(f"  {'-'*38:<40} {'-'*20:<22} {'-'*20}")
        for g in groups:
            added = g.get("added_at")
            added_str = (
                added.strftime("%Y-%m-%d %H:%M")
                if isinstance(added, datetime)
                else str(added)[:16]
            )
            print(f"  {g['group_id']:<40} {added_str:<22} {g.get('added_by', '')}")
    else:
        print("\nNo excluded groups.")


def cmd_add_sample(args):
    client, db = get_db()
    try:
        result = db["excluded_samples"].update_one(
            {"sample_id": args.sample_id, "profile": args.profile},
            {
                "$setOnInsert": {
                    "sample_id": args.sample_id,
                    "profile": args.profile,
                    "added_at": datetime.now(timezone.utc),
                    "added_by": args.added_by,
                }
            },
            upsert=True,
        )
    finally:
        client.close()

    if result.upserted_id:
        print(f"Added: {args.sample_id} (profile: {args.profile})")
    else:
        print(f"Already excluded: {args.sample_id} (profile: {args.profile})")


def cmd_add_group(args):
    client, db = get_db()
    try:
        result = db["excluded_groups"].update_one(
            {"group_id": args.group_id},
            {
                "$setOnInsert": {
                    "group_id": args.group_id,
                    "added_at": datetime.now(timezone.utc),
                    "added_by": args.added_by,
                }
            },
            upsert=True,
        )
    finally:
        client.close()

    if result.upserted_id:
        print(f"Added group: {args.group_id}")
    else:
        print(f"Already excluded: {args.group_id}")


def cmd_remove_sample(args):
    client, db = get_db()
    try:
        result = db["excluded_samples"].delete_one(
            {"sample_id": args.sample_id, "profile": args.profile}
        )
    finally:
        client.close()

    if result.deleted_count:
        print(f"Removed: {args.sample_id} (profile: {args.profile})")
    else:
        print(f"Not found: {args.sample_id} (profile: {args.profile})")


def cmd_remove_group(args):
    client, db = get_db()
    try:
        result = db["excluded_groups"].delete_one({"group_id": args.group_id})
    finally:
        client.close()

    if result.deleted_count:
        print(f"Removed group: {args.group_id}")
    else:
        print(f"Not found: {args.group_id}")


def main():
    parser = argparse.ArgumentParser(
        description="Manage MIMOSA excluded_samples and excluded_groups.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List all excluded samples and groups")

    p_add_s = sub.add_parser("add-sample", help="Add a sample to the exclusion list")
    p_add_s.add_argument("sample_id", help="Sample ID to exclude")
    p_add_s.add_argument(
        "--profile", required=True, help="Analysis profile (e.g. staphylococcus_aureus)"
    )
    p_add_s.add_argument("--added-by", default="cli", metavar="NAME")

    p_add_g = sub.add_parser(
        "add-group", help="Add a Bonsai group to the exclusion list"
    )
    p_add_g.add_argument("group_id", help="Bonsai group ID to exclude")
    p_add_g.add_argument("--added-by", default="cli", metavar="NAME")

    p_rm_s = sub.add_parser(
        "remove-sample", help="Remove a sample from the exclusion list"
    )
    p_rm_s.add_argument("sample_id", help="Sample ID to remove")
    p_rm_s.add_argument("--profile", required=True, help="Analysis profile")

    p_rm_g = sub.add_parser(
        "remove-group", help="Remove a Bonsai group from the exclusion list"
    )
    p_rm_g.add_argument("group_id", help="Bonsai group ID to remove")

    args = parser.parse_args()

    commands = {
        "list": cmd_list,
        "add-sample": cmd_add_sample,
        "add-group": cmd_add_group,
        "remove-sample": cmd_remove_sample,
        "remove-group": cmd_remove_group,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
