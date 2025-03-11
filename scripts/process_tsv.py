#!/usr/bin/env python3
import csv
import json
import datetime

def process_tsv(metadata_partitions_tsv, features_json):
    """
    Process the _metadata_w_partitions.tsv file produced by ReporTree and generate JSON outputs.
    """
    features = []

    try:
        with open(metadata_partitions_tsv, newline='', encoding='utf-8') as tsvfile:
            reader = csv.DictReader(tsvfile, delimiter='\t')
            for row in reader:
                profile = row.get("Profile", "").strip()
                properties = {
                    "PostCode": row.get("PostCode", "").strip(),
                    "Hospital": row.get("Hospital", "").strip(),
                    "analysis_profile": profile,
                    "Date": row.get("Date", "").strip(),
                    "ID": row.get("sample", "").strip(),
                    "QC_Status":row.get("QC_Status","").strip(),
                }

                if profile == "staphylococcus_aureus":
                    properties.update({
                        "ST": row.get("ST", "").strip(),
                        "arcC": row.get("arcC", "").strip(),
                        "aroE": row.get("aroE", "").strip(),
                        "pta": row.get("pta", "").strip(),
                        "glpF": row.get("glpF", "").strip(),
                        "gmk": row.get("gmk", "").strip(),
                        "tpi": row.get("tpi", "").strip(),
                        "yqiL": row.get("yqiL", "").strip()
                    })

                features.append({
                    "type": "Feature",
                    "properties": properties,
                    "geometry": {"type": "Point", "coordinates": []}
                })

        # Save features to JSON
        with open(features_json, "w", encoding="utf-8") as jsonfile:
            json.dump(features, jsonfile, indent=2, ensure_ascii=False)

        print(f"Successfully processed results")

    except Exception as e:
        print(f" Error processing results: {e}")

    return features

def process_cluster_composition(clusterComposition_tsv,clusters_json):
    """
    Process the _clusterComposition.tsv file produced by ReporTree and generate JSON output 
    """
    clustering = []
   
    with open(clusterComposition_tsv, newline='', encoding='utf-8') as infile:
        reader = csv.DictReader(infile, delimiter='\t')
        for row in reader:
            # Split the 'samples' field on commas and strip any whitespace
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

    with open(clusters_json, "w", encoding='utf-8') as outfile:
        json.dump(clustering_result, outfile, indent=2)
