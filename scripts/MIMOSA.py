#!/usr/bin/env python3
import os
import csv
import json
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient
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
from constants import get_reportree_params

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


def _get_nomenclature_file(profile, profile_dir, is_interactive):
    """
    Fetch the latest clustering document for this profile
    """
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")

    client = MongoClient(mongo_uri)
    db = client[db_name]
    clustering_doc = db["clustering"].find_one(
        {"analysis_profile": profile},
        sort=[("_id", -1)],
    )
    client.close()

    if not clustering_doc:
        return None

    params = get_reportree_params(profile)
    expected_partition = f"MST-{params['threshold']}x1.0"

    results = clustering_doc.get("results", [])
    stored_partition = results[0]["Partition"] if results else None

    if stored_partition != expected_partition:
        print(
            f"[{profile}] WARNING: Stored partition column is '{stored_partition}' "
            f"but the current run expects '{expected_partition}'."
        )
        print(f"[{profile}] This likely means the clustering threshold has changed.")

        if is_interactive:
            answer = (
                input(
                    f"[{profile}] Proceed without preserving cluster names? (yes/no): "
                )
                .strip()
                .lower()
            )
            if answer not in ("yes", "y"):
                raise RuntimeError(
                    f"[{profile}] Aborted by user due to partition mismatch."
                )
        else:
            print(f"[{profile}] skipping nomenclature file.")

        return None

    nomenclature_path = os.path.join(profile_dir, f"{profile}_nomenclature.tsv")
    with open(nomenclature_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter="\t")
        writer.writerow(["sample", stored_partition])
        for entry in results:
            cluster_id = entry["Cluster_ID"]
            label = (
                f"cluster_{cluster_id}"
                if isinstance(cluster_id, int)
                else str(cluster_id)
            )
            writer.writerow([entry["ID"], label])

    return nomenclature_path


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
    is_interactive=False,
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

    nomenclature_file = _get_nomenclature_file(profile, profile_dir, is_interactive)

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
        nomenclature_file=nomenclature_file,
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
