#!/usr/bin/env python3
import os
import csv
import json
import datetime
import pandas as pd
from api import fetch_samples, fetch_sample_details


def process_samples_by_profile(
    bonsai_api_url,
    token,
    output_folder,
    target_profiles=None,
    user_selected_profiles=None,
):
    """
    Process samples grouped by their profiles, filtering based on target_profiles.
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    samples = fetch_samples(bonsai_api_url, token)
    profiles = {}

    for sample in samples:
        profile = sample.get("profile", "Unknown")
        sample_id = sample.get("sample_id")

        if not sample_id or not profile:
            continue

        if target_profiles is None or profile in target_profiles:
            profiles.setdefault(profile, []).append(sample_id)

    if not profiles:
        print("No samples match the specified profiles. Exiting.")
        return None, None

    metadata_files = []
    cgmlst_files = []

    for profile, sample_ids in profiles.items():
        print(f"\nProcessing profile: {profile} with {len(sample_ids)} samples")
        cgmlst_data_frames = []
        metadata_rows = []

        for sample_id in sample_ids:
            sample_data = fetch_sample_details(bonsai_api_url, token, sample_id)

            sequencing_date = sample_data.get("sequencing_date", "Unknown")
            date_part, time_part = (
                sequencing_date.split("T")
                if "T" in sequencing_date
                else (sequencing_date, "Unknown")
            )

            pipeline_version = sample_data.get("pipeline", {}).get("version", "Unknown")
            pipeline_date_full = sample_data.get("pipeline", {}).get("date", "")
            pipeline_date = (
                pipeline_date_full.split("T")[0]
                if "T" in pipeline_date_full
                else pipeline_date_full
            )
            analysis_profile = sample_data.get("pipeline", {}).get(
                "analysis_profile", "Unknown"
            )
            lims_id = sample_data.get("lims_id", "Unknown")
            qc_status = sample_data.get("qc_status", {}).get("status", "Unknown")

            common_fields = {
                "sample": sample_id,
                "lims_id": lims_id,
                "Date": date_part,
                "Time": time_part,
                "Pipeline_Version": pipeline_version,
                "Pipeline_Date": pipeline_date,
                "Profile": analysis_profile,
                "QC_Status": qc_status,
            }
            metadata_row = common_fields.copy()

            if analysis_profile.lower() in [
                "staphylococcus_aureus",
                "klebsiella_pneumoniae",
            ]:
                mlst_result = next(
                    (
                        result
                        for result in sample_data.get("typing_result", [])
                        if result.get("type") == "mlst"
                    ),
                    {},
                )
                metadata_row["ST"] = mlst_result.get("result", {}).get(
                    "sequence_type", "Unknown"
                )
                alleles = mlst_result.get("result", {}).get("alleles", {})
                for gene, allele in alleles.items():
                    metadata_row[gene] = allele

            typing_results = sample_data.get("typing_result", [])
            cgmlst_result = None
            for result in typing_results:
                if result.get("type", "").lower() == "cgmlst":
                    cgmlst_result = result
                    break

            if cgmlst_result:
                alleles = cgmlst_result.get("result", {}).get("alleles", {})
                allele_row = {"sample": sample_id}
                allele_row.update(alleles)
                cgmlst_data_frames.append(pd.DataFrame([allele_row]))
            else:
                print(f"No cgMLST data found for sample {sample_id}")

            metadata_rows.append(metadata_row)

        metadata_file = os.path.join(output_folder, f"metadata_{profile}.tsv")
        metadata_df = pd.DataFrame(metadata_rows)
        metadata_df.to_csv(metadata_file, sep="\t", index=False)
        metadata_files.append(metadata_file)

        if cgmlst_data_frames:
            combined_cgmlst = pd.concat(cgmlst_data_frames, ignore_index=True)
            # Replace missing codes
            missing_codes = [
                "ASM",
                "EXC",
                "INF",
                "LNF",
                "PLNF",
                "PLOT3",
                "PLOT5",
                "LOTSC",
                "NIPH",
                "NIPHEM",
                "PAMA",
                "ALM",
            ]
            combined_cgmlst.replace(missing_codes, "0", inplace=True)

            cgmlst_file = os.path.join(output_folder, f"cgmlst_{profile}.tsv")
            combined_cgmlst.to_csv(cgmlst_file, sep="\t", index=False)
            cgmlst_files.append(cgmlst_file)
        else:
            print(f"No cgMLST data collected for profile {profile}")

    return metadata_files, cgmlst_files
