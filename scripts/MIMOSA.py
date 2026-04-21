#!/usr/bin/env python3
import os
import json
from dotenv import load_dotenv
from pathlib import Path
from process_samples import process_samples_by_profile
from run_reportree import run_reportree
from process_tsv import (
    process_tsv,
    process_cluster_composition,
    parse_distance_tsv,
    read_newick,
)
from upload import (
    upload_features,
    upload_clustering,
    upload_distance,
)
from mimosa_runner import run_stage
from mimosa_state import Status

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


def mimosa(
    profile,
    profile_dir,
    args,
    credentials,
    token,
    sample_ids,
    upload_token,
    state,
    run_clustering=True,
):
    os.makedirs(profile_dir, exist_ok=True)
    sample_count = len(sample_ids)

    metadata_files, cgmlst_files = run_stage(
        state,
        profile,
        "prepare_metadata",
        process_samples_by_profile,
        bonsai_api_url=credentials["bonsai_api_url"],
        token=token,
        output_folder=profile_dir,
        target_profiles=[profile],
        user_selected_profiles=args.profile,
        count=sample_count,
        sample_ids=sample_ids,
        run_clustering=run_clustering,
    )

    if not metadata_files:
        state[profile]["prepare_metadata"]["status"] = Status.SKIPPED
        return False

    if run_clustering and not cgmlst_files:
        raise RuntimeError(
            f"[{profile}] Clustering requested but cgMLST data is missing."
        )

    metadata_entry = metadata_files[0]
    full_metadata_file = metadata_entry["full"]
    reportree_metadata_file = metadata_entry["reportree_safe"]
    cgmlst_file = cgmlst_files[0] if cgmlst_files else None

    if getattr(args, "supplementary_metadata", None):
        from update_metadata import update_metadata_with_supplementary_metadata

        update_metadata_with_supplementary_metadata(
            full_metadata_file,
            args.supplementary_metadata,
        )

    metadata_partitions_tsv = os.path.join(
        profile_dir,
        f"{profile}_metadata_w_partitions.tsv",
    )

    features_json_path = os.path.join(
        profile_dir,
        f"features_{profile}.json",
    )

    if args.update_only:
        run_stage(
            state,
            profile,
            "process_features",
            process_tsv,
            full_metadata_file,
            full_metadata_file,
            features_json_path,
            save_files=True,
            count=sample_count,
        )

        run_stage(
            state,
            profile,
            "upload_features",
            upload_features,
            features_json_path,
            overwrite=True,
            show_log=True,
            upload_token=upload_token,
            count=sample_count,
        )

        state[profile]["run_reportree"]["status"] = Status.SKIPPED
        state[profile]["upload_clustering"]["status"] = Status.SKIPPED
        state[profile]["upload_distance"]["status"] = Status.SKIPPED
        return False

    if not run_clustering:
        print(
            f"[{profile}] Clustering skipped — no new samples and re-cluster not requested"
        )

        run_stage(
            state,
            profile,
            "process_features",
            process_tsv,
            full_metadata_file,
            full_metadata_file,
            features_json_path,
            save_files=True,
            count=sample_count,
        )

        run_stage(
            state,
            profile,
            "upload_features",
            upload_features,
            features_json_path,
            overwrite=True,
            show_log=True,
            upload_token=upload_token,
            count=sample_count,
        )

        state[profile]["run_reportree"]["status"] = Status.SKIPPED
        state[profile]["upload_clustering"]["status"] = Status.SKIPPED
        state[profile]["upload_distance"]["status"] = Status.SKIPPED
        return False

    run_stage(
        state,
        profile,
        "run_reportree",
        run_reportree,
        reportree_metadata_file,
        cgmlst_file,
        profile_dir,
        profile,
        save_files=True,
        count=sample_count,
    )

    cluster_composition_tsv = os.path.join(
        profile_dir,
        f"{profile}_clusterComposition.tsv",
    )

    clusters_json_path = os.path.join(
        profile_dir,
        f"clusters_{profile}.json",
    )

    dist_tsv = os.path.join(
        profile_dir,
        f"{profile}_dist_hamming.tsv",
    )

    nwk_path = os.path.join(
        profile_dir,
        f"{profile}.nwk",
    )

    distance_json_path = os.path.join(
        profile_dir,
        f"{profile}_distance.json",
    )

    run_stage(
        state,
        profile,
        "process_features",
        process_tsv,
        metadata_partitions_tsv,
        full_metadata_file,
        features_json_path,
        save_files=True,
        count=sample_count,
    )

    clustering_result = process_cluster_composition(
        cluster_composition_tsv,
        save_files=False,
    )
    clustering_result["analysis_profile"] = profile

    with open(clusters_json_path, "w", encoding="utf-8") as f:
        json.dump(clustering_result, f, indent=2)

    run_stage(
        state,
        profile,
        "upload_features",
        upload_features,
        features_json_path,
        overwrite=True,
        show_log=False,
        upload_token=upload_token,
        count=sample_count,
    )

    run_stage(
        state,
        profile,
        "upload_clustering",
        upload_clustering,
        clusters_json_path,
        upload_token=upload_token,
        count=sample_count,
    )

    if os.path.exists(dist_tsv) and os.path.exists(nwk_path):
        samples, matrix = parse_distance_tsv(dist_tsv)
        newick_text = read_newick(nwk_path)

        distance_doc = {
            "analysis_profile": profile,
            "samples": samples,
            "matrix": matrix,
            "newick": newick_text,
        }

        with open(distance_json_path, "w", encoding="utf-8") as f:
            json.dump(distance_doc, f, indent=2)

        run_stage(
            state,
            profile,
            "upload_distance",
            upload_distance,
            distance_json_path,
            upload_token=upload_token,
            count=sample_count,
        )
    else:
        print("Distance matrix or Newick missing — skipping")
        state[profile]["upload_distance"]["status"] = Status.SKIPPED

    return True
