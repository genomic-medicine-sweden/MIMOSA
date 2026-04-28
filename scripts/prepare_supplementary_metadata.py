#!/usr/bin/env python3
import os
import time
import argparse
import pandas as pd
import requests
from api import (
    load_credentials,
    get_access_token,
    fetch_samples,
    fetch_sample_details,
    fetch_group,
    validate_groups,
)
from constants import AVAILABLE_PROFILES

FETCH_RETRIES = 3
FETCH_RETRY_DELAY = 5


def fetch_sample_details_with_retry(bonsai_api_url, token, sample_id):
    for attempt in range(1, FETCH_RETRIES + 1):
        try:
            return fetch_sample_details(bonsai_api_url, token, sample_id)
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code >= 500:
                if attempt < FETCH_RETRIES:
                    print(
                        f"  [{sample_id}] Server error, retrying ({attempt}/{FETCH_RETRIES})..."
                    )
                    time.sleep(FETCH_RETRY_DELAY)
                else:
                    print(
                        f"  [{sample_id}] Server error after {FETCH_RETRIES} attempts, skipping."
                    )
                    return None
            else:
                raise


def parse_args():
    parser = argparse.ArgumentParser(
        description="Prepare supplementary metadata file based on samples in Bonsai."
    )
    parser.add_argument(
        "--credentials", required=True, help="Path to Bonsai credentials file."
    )
    parser.add_argument("--output", required=True, help="Output folder path.")
    parser.add_argument(
        "--profile",
        required=False,
        nargs="+",
        default=None,
        help="Target profile(s) to extract samples for, or 'All' for all profiles.",
    )
    parser.add_argument(
        "--groups",
        required=False,
        nargs="+",
        default=None,
        help="Optional group ID(s) to restrict samples to.",
    )

    args = parser.parse_args()

    if args.profile is None or "All" in args.profile:
        args.profile = AVAILABLE_PROFILES
    else:
        invalid = [p for p in args.profile if p not in AVAILABLE_PROFILES]
        if invalid:
            parser.error(
                f"Invalid profile(s): {', '.join(invalid)}. "
                f"Choose from: {', '.join(AVAILABLE_PROFILES)}"
            )

    return args


def prepare_supplementary(
    bonsai_api_url, token, output_folder, profile, group_sample_ids=None, groups=None
):
    samples = fetch_samples(bonsai_api_url, token)
    matched_samples = [s for s in samples if s.get("profile") == profile]

    if group_sample_ids is not None:
        matched_samples = [
            s for s in matched_samples if s.get("sample_id") in group_sample_ids
        ]

    if not matched_samples:
        print(f"No samples found for profile: {profile}")
        return

    group_suffix = "_" + "-".join(groups) if groups else ""
    output_path = os.path.join(
        output_folder, f"supplementary_metadata_{profile}{group_suffix}.csv"
    )

    rows = []
    skipped = 0

    for sample in matched_samples:
        sample_id = sample.get("sample_id")
        if not sample_id:
            continue

        details = fetch_sample_details_with_retry(bonsai_api_url, token, sample_id)
        if details is None:
            skipped += 1
            continue

        lims_id = details.get("lims_id", "Unknown")

        rows.append(
            {
                "sample": sample_id,
                "lims_id": lims_id,
                "PostCode": "",
                "Hospital": "",
                "Date": "",
            }
        )

    if not rows:
        print(f"No data could be retrieved for profile: {profile}")
        return

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)

    msg = f"Supplementary metadata saved to: {output_path} ({len(rows)} samples)"
    if skipped:
        msg += f" — {skipped} sample(s) skipped due to server errors"
    print(msg)


def main():
    args = parse_args()
    credentials = load_credentials(args.credentials)
    token = get_access_token(credentials)

    if not os.path.exists(args.output):
        os.makedirs(args.output)

    group_sample_ids = None
    if args.groups:
        try:
            validate_groups(credentials["bonsai_api_url"], token, args.groups)
        except ValueError as e:
            raise SystemExit(f"Error: {e}\nPlease check the group IDs and try again.")

        group_sample_ids = set()
        for gid in args.groups:
            group_sample_ids.update(
                fetch_group(credentials["bonsai_api_url"], token, gid)
            )

    for profile in args.profile:
        prepare_supplementary(
            credentials["bonsai_api_url"],
            token,
            args.output,
            profile,
            group_sample_ids,
            groups=args.groups,
        )


if __name__ == "__main__":
    main()
