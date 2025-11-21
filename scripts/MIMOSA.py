#!/usr/bin/env python3
import os
import json
from dotenv import load_dotenv, find_dotenv

from process_samples import process_samples_by_profile
from run_reportree import run_reportree
from process_tsv import process_tsv, process_cluster_composition
from upload import upload_features, upload_clustering, upload_similarity
from process_similarity import process_similarity

dotenv_path = find_dotenv(filename=".env", usecwd=True)
if not dotenv_path:
    raise FileNotFoundError("Could not find project-root .env file.")
load_dotenv(dotenv_path)

def mimosa(profile, profile_dir, args, credentials, token, sample_ids, upload_token):
    os.makedirs(profile_dir, exist_ok=True)

    metadata_files, cgmlst_files = process_samples_by_profile(
        bonsai_api_url=credentials["bonsai_api_url"],
        token=token,
        output_folder=profile_dir,
        target_profiles=[profile],
        user_selected_profiles=args.profile
    )

    if not metadata_files or not cgmlst_files:
        return

    metadata_file = metadata_files[0]
    cgmlst_file = cgmlst_files[0]

    if args.supplementary_metadata:
        from update_metadata import update_metadata_with_supplementary_metadata
        update_metadata_with_supplementary_metadata(metadata_file, args.supplementary_metadata)

    if args.update:
        metadata_partitions_tsv = metadata_file
        features_json_path = os.path.join(profile_dir, f"features_{profile}.json")
        process_tsv(metadata_partitions_tsv, features_json_path, save_files=True)
        upload_features(features_json_path, overwrite=True, show_log=True,upload_token=upload_token)
        return

    run_reportree(
        metadata_file,
        cgmlst_file,
        profile_dir,
        profile,
        save_files=True
    )

    metadata_partitions_tsv = os.path.join(profile_dir, f"{profile}_metadata_w_partitions.tsv")
    cluster_composition_tsv = os.path.join(profile_dir, f"{profile}_clusterComposition.tsv")
    features_json_path = os.path.join(profile_dir, f"features_{profile}.json")
    clusters_json_path = os.path.join(profile_dir, f"clusters_{profile}.json")

    process_tsv(metadata_partitions_tsv, features_json_path, save_files=True)
    process_cluster_composition(cluster_composition_tsv, clusters_json_path, save_files=True)

    show_log = args.update or len(sample_ids) == 0

    upload_features(
        features_json_path,
        overwrite=args.update,
        show_log=show_log,
        upload_token=upload_token
        )

    upload_clustering(clusters_json_path,upload_token=upload_token)

    similarity_path = os.path.join(profile_dir, f"{profile}_similarity.json")
    if os.path.exists(similarity_path):
        with open(similarity_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    else:
        existing = []

    new_results = process_similarity(
        credentials["bonsai_api_url"],
        token,
        list(sample_ids),
        profile_dir,
        profile,
        save_files=True
    ) if sample_ids else []

    existing_ids = {item["ID"] for item in existing}
    affected_ids = {
        neighbor.get("ID")
        for result in new_results
        for neighbor in result.get("similar", [])
        if neighbor.get("ID") in existing_ids
    }

    affected_results = process_similarity(
        credentials["bonsai_api_url"],
        token,
        list(affected_ids),
        profile_dir,
        profile,
        save_files=True
    ) if affected_ids else []

    combined = [
        r for r in existing if r["ID"] not in {r["ID"] for r in affected_results}
    ] + new_results + affected_results

    with open(similarity_path, 'w', encoding='utf-8') as f:
        json.dump(combined, f, indent=2)

    upload_similarity(similarity_path, upload_token=upload_token)

