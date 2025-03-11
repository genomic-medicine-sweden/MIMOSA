#!/usr/bin/env python3
import argparse
import os
from api import load_credentials, get_access_token,fetch_samples
from process_samples import process_samples_by_profile
from process_tsv import process_tsv,process_cluster_composition
from update_metadata import update_metadata_with_supplementary_metadata
from run_reportree import run_reportree
from upload import upload_features,upload_clustering,upload_similarity
from process_similarity import process_similarity


AVAILABLE_PROFILES = ["staphylococcus_aureus"]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Process sample data, run ReporTree, and upload results to MIMOSA."
    )
    parser.add_argument("--credentials", required=True, help="Path to Bonsai credentials file.")
    parser.add_argument("--output", required=True, help="Output folder path.")
    parser.add_argument("--supplementary_metadata", required=True, help="Path to csv file with additional metadata (Postcode, Hospital,...)´.")
    parser.add_argument("--config", required=True, help="Path to Config file.")
    parser.add_argument(
        "--profile",
        required=True,
        nargs="+",
        help=("Target profile(s) to process (e.g. staphylococcus_aureus). "
              "Pass 'All' to process all available profiles.")
    )
    args = parser.parse_args()

    
    if len(args.profile) == 1 and args.profile[0].lower() == "all":
        target_profiles = AVAILABLE_PROFILES
    else:
        target_profiles = [p for p in args.profile if p in AVAILABLE_PROFILES]

    if not target_profiles:
        print("No valid profiles selected. Exiting.")
        exit(1)

    return args, target_profiles

def main():
    args, target_profiles = parse_args()

    # Load API credentials and retrieve an access token.
    credentials = load_credentials(args.credentials)
    token = get_access_token(credentials)

    #  Process valid profiles
    metadata_files, cgmlst_files = process_samples_by_profile(
        api_url=credentials["api_url"],
        token=token,
        output_folder=args.output,
        target_profiles=target_profiles,
        user_selected_profiles=args.profile
    )

    if metadata_files and cgmlst_files:
        #  Update metadata for valid profiles
        for meta_file in metadata_files:
            update_metadata_with_supplementary_metadata(meta_file, args.supplementary_metadata)

        #  Run ReporTree for valid profiles
        for meta_file, cgmlst_file in zip(metadata_files, cgmlst_files):
            profile = os.path.basename(meta_file).split("_", 1)[1].rsplit(".", 1)[0]
            run_reportree(meta_file, cgmlst_file, args.output, profile)

    #  Process and upload data for valid profiles
    if metadata_files:
        for meta_file in metadata_files:
            profile = os.path.basename(meta_file).split("_", 1)[1].rsplit(".", 1)[0]
            metadata_partitions_tsv = os.path.join(args.output, f"{profile}_metadata_w_partitions.tsv")
            clusterComposition_tsv = os.path.join(args.output, f"{profile}_clusterComposition.tsv")
            features_json = os.path.join(args.output, f"features_{profile}.json")
            clusters_json = os.path.join(args.output, f"clusters_{profile}.json")

            process_tsv(metadata_partitions_tsv, features_json)
            process_cluster_composition(clusterComposition_tsv, clusters_json)
            upload_features(args.config, features_json)
            upload_clustering(args.config, clusters_json)

    # Process similarity for valid profiles
    samples = fetch_samples(credentials["api_url"], token)
    target_samples = [sample for sample in samples if sample.get("profile") in target_profiles]

    for profile in target_profiles:
        profile_samples = [sample for sample in target_samples if sample.get("profile") == profile]
        sample_ids = [sample["sample_id"] for sample in profile_samples if "sample_id" in sample]
        if sample_ids:
            similarity_results = process_similarity(credentials["api_url"], token, sample_ids, args.output, profile)
        else:
            print(f"\nNo samples found for similarity processing for profile: {profile}.")
    
        similarity_json = os.path.join(args.output, f"{profile}_similarity.json")
        upload_similarity(args.config, similarity_json)
    
if __name__ == "__main__":
    main()

