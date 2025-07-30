#!/usr/bin/env python3
import os
import argparse
import pandas as pd
from api import load_credentials, get_access_token, fetch_samples, fetch_sample_details
from main import AVAILABLE_PROFILES

def parse_args():
    parser = argparse.ArgumentParser(
        description="Prepare supplementary metadata file based on samples in Bonsai."
    )
    parser.add_argument("--credentials", required=True, help="Path to Bonsai credentials file.")
    parser.add_argument("--output", required=True, help="Output folder path.")
    parser.add_argument(
        "--profile",
        required=True,
        choices=AVAILABLE_PROFILES,
        help="Target profile to extract samples for (e.g. staphylococcus_aureus)."
    )
    return parser.parse_args()

def prepare_supplementary(api_url, token, output_folder, profile):
    samples = fetch_samples(api_url, token)
    matched_samples = [s for s in samples if s.get("profile") == profile]

    if not matched_samples:
        print(f"No samples found for profile: {profile}")
        return

    output_path = os.path.join(output_folder, f"supplementary_metadata_{profile}.csv")
    rows = []

    for sample in matched_samples:
        sample_id = sample.get("sample_id")
        if not sample_id:
            continue

        details = fetch_sample_details(api_url, token, sample_id)
        lims_id = details.get("lims_id", "Unknown")

        rows.append({
            "sample": sample_id,
            "lims_id": lims_id,
            "PostCode": "",
            "Hospital": "",
            "Date": ""
        })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"Supplementary metadata saved to: {output_path}")

def main():
    args = parse_args()
    credentials = load_credentials(args.credentials)
    token = get_access_token(credentials)

    if not os.path.exists(args.output):
        os.makedirs(args.output)

    prepare_supplementary(credentials["api_url"], token, args.output, args.profile)

if __name__ == "__main__":
    main()

