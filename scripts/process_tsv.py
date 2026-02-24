#!/usr/bin/env python3
import csv
import json
import datetime


def process_tsv(
    metadata_partitions_tsv,
    full_metadata_file,
    features_json_path=None,
    save_files=False,
):
    """
    Process the _metadata_w_partitions.tsv file produced by ReporTree and generate
    JSON outputs compatible with the Mongoose Feature schema.

    ReporTree runs on a restricted metadata file. All metadata fields are restored
    from the full metadata file before upload.
    """

    features = []
    metadata_lookup = {}

    with open(full_metadata_file, newline="", encoding="utf-8") as full_file:
        full_reader = csv.DictReader(full_file, delimiter="\t")
        full_fields = full_reader.fieldnames or []

        base_fields = {
            "PostCode",
            "Hospital",
            "Profile",
            "Pipeline_Version",
            "Pipeline_Date",
            "Date",
            "sample",
            "QC_Status",
            "ST",
            "Time",
            "lims_id",
        }

        allele_fields = set(full_fields) - base_fields

        for row in full_reader:
            sample_id = row.get("sample", "").strip()
            if not sample_id:
                continue

            typing = {
                "ST": row.get("ST", "").strip(),
                "alleles": {},
            }

            for field in allele_fields:
                value = row.get(field, "").strip()
                if value:
                    typing["alleles"][field] = value

            metadata_lookup[sample_id] = {
                "PostCode": row.get("PostCode", "").strip(),
                "Hospital": row.get("Hospital", "").strip(),
                "analysis_profile": row.get("Profile", "").strip(),
                "Pipeline_Version": row.get("Pipeline_Version", "").strip(),
                "Pipeline_Date": row.get("Pipeline_Date", "").strip(),
                "Date": row.get("Date", "").strip(),
                "QC_Status": row.get("QC_Status", "").strip(),
                "typing": typing,
            }

    try:
        with open(metadata_partitions_tsv, newline="", encoding="utf-8") as tsvfile:
            reader = csv.DictReader(tsvfile, delimiter="\t")

            for row in reader:
                sample_id = row.get("sample", "").strip()
                if not sample_id:
                    continue

                if sample_id not in metadata_lookup:
                    continue

                full_meta = metadata_lookup[sample_id]

                properties = {
                    "PostCode": full_meta["PostCode"],
                    "Hospital": full_meta["Hospital"],
                    "analysis_profile": full_meta["analysis_profile"],
                    "Pipeline_Version": full_meta["Pipeline_Version"],
                    "Pipeline_Date": full_meta["Pipeline_Date"],
                    "Date": full_meta["Date"],
                    "ID": sample_id,
                    "QC_Status": full_meta["QC_Status"],
                }

                typing = full_meta.get("typing", {})
                if typing.get("ST") or typing.get("alleles"):
                    properties["typing"] = typing

                features.append(
                    {
                        "type": "Feature",
                        "properties": properties,
                        "geometry": {
                            "type": "Point",
                            "coordinates": [],
                        },
                    }
                )

        print("Successfully processed results")

        if save_files and features_json_path:
            with open(features_json_path, "w", encoding="utf-8") as jsonfile:
                json.dump(features, jsonfile, indent=2, ensure_ascii=False)

    except Exception as e:
        print(f"Error processing results: {e}")

    return features


def process_cluster_composition(
    clusterComposition_tsv,
    clusters_json_path=None,
    save_files=False,
):
    """
    Process the _clusterComposition.tsv file produced by ReporTree
    and generate JSON output.
    """

    clustering = []

    with open(clusterComposition_tsv, newline="", encoding="utf-8") as infile:
        reader = csv.DictReader(infile, delimiter="\t")

        for row in reader:
            cluster_raw = row["cluster"].strip()

            if cluster_raw.lower().startswith("cluster_"):
                parts = cluster_raw.split("_", 1)
                if len(parts) > 1 and parts[1].isdigit():
                    cluster_id = int(parts[1])
                else:
                    cluster_id = cluster_raw
            else:
                cluster_id = cluster_raw

            sample_list = [s.strip() for s in row["samples"].split(",")]

            for sample in sample_list:
                clustering.append(
                    {
                        "ID": sample,
                        "Cluster_ID": cluster_id,
                        "Partition": row["#partition"].strip(),
                    }
                )

    clustering_result = {
        "results": clustering,
        "createdAt": datetime.datetime.now().isoformat(),
    }

    if save_files and clusters_json_path:
        with open(clusters_json_path, "w", encoding="utf-8") as outfile:
            json.dump(clustering_result, outfile, indent=2)

    return clustering_result


def parse_distance_tsv(tsv_path):
    """
    Parse the *_dist_hamming.tsv file produced by ReporTree.
    """

    with open(tsv_path, "r") as f:
        lines = [line.strip().split("\t") for line in f.readlines()]

    samples = lines[0][1:]
    matrix = [[int(x) for x in row[1:]] for row in lines[1:]]

    return samples, matrix


def read_newick(path):
    with open(path, "r") as f:
        return f.read().strip()
