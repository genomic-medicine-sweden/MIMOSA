#!/usr/bin/env python3
import csv
import json
import datetime

def process_tsv(metadata_partitions_tsv, features_json_path=None, save_files=False):
    """
    Process the _metadata_w_partitions.tsv file produced by ReporTree and generate JSON outputs
    compatible with the Mongoose Feature schema.
    """

    features = []

    base_fields = {
        "PostCode", "Hospital", "Profile", "Pipeline_Version",
        "Pipeline_Date", "Date", "sample", "QC_Status", "ST"
    }

    non_allele_field = {"Time", "lims_id", "MST-9x1.0", "Partition"}

    try:
        with open(metadata_partitions_tsv, newline='', encoding='utf-8') as tsvfile:
            reader = csv.DictReader(tsvfile, delimiter='\t')
            fieldnames = reader.fieldnames or []

            for row in reader:
                profile = row.get("Profile", "").strip()

                properties = {
                    "PostCode": row.get("PostCode", "").strip(),
                    "Hospital": row.get("Hospital", "").strip(),
                    "analysis_profile": profile,
                    "Pipeline_Version": row.get("Pipeline_Version", "").strip(),
                    "Pipeline_Date": row.get("Pipeline_Date", "").strip(),
                    "Date": row.get("Date", "").strip(),
                    "ID": row.get("sample", "").strip(),
                    "QC_Status": row.get("QC_Status", "").strip()
                }

                typing = {
                    "ST": row.get("ST", "").strip(),
                    "alleles": {}
                }

                allele_fields = set(fieldnames) - base_fields - non_allele_field

                for field in allele_fields:
                    value = row.get(field, "").strip()
                    if value:
                        typing["alleles"][field] = value

                if typing["ST"] or typing["alleles"]:
                    properties["typing"] = typing

                features.append({
                    "type": "Feature",
                    "properties": properties,
                    "geometry": {
                        "type": "Point",
                        "coordinates": []
                    }
                })

        print("Successfully processed results")

        if save_files and features_json_path:
            with open(features_json_path, "w", encoding="utf-8") as jsonfile:
                json.dump(features, jsonfile, indent=2, ensure_ascii=False)

    except Exception as e:
        print(f"Error processing results: {e}")

    return features


def process_cluster_composition(clusterComposition_tsv, clusters_json_path=None, save_files=False):
    """
    Process the _clusterComposition.tsv file produced by ReporTree and generate JSON output.
    """
    clustering = []

    with open(clusterComposition_tsv, newline='', encoding='utf-8') as infile:
        reader = csv.DictReader(infile, delimiter='\t')
        for row in reader:
            sample_list = [sample.strip() for sample in row["samples"].split(',')]
            for sample in sample_list:
                clustering.append({
                    "ID": sample,
                    "Cluster_ID": row["cluster"].strip(),
                    "Partition": row["#partition"].strip()
                })

    clustering_result = {
        "results": clustering,
        "createdAt": datetime.datetime.now().isoformat()
    }

    if save_files and clusters_json_path:
        with open(clusters_json_path, "w", encoding='utf-8') as outfile:
            json.dump(clustering_result, outfile, indent=2)

    return clustering_result

