#!/usr/bin/env python3
import os
import pandas as pd
from api import fetch_samples, fetch_sample_details

REPORTREE_SAFE_COLUMNS = [
    "sample",
    "Profile",
    "Pipeline_Version",
    "Pipeline_Date",
]


def normalise_missing(value):
    """
    Convert placeholder API values to proper missing values (None).
    """
    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()
        if value == "" or value.lower() == "unknown":
            return None
        return value

    return value


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
    os.makedirs(output_folder, exist_ok=True)

    samples = fetch_samples(bonsai_api_url, token)
    profiles = {}

    for sample in samples:
        profile = sample.get("profile")
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

        metadata_rows = []
        cgmlst_frames = []

        for sample_id in sample_ids:
            sample_data = fetch_sample_details(bonsai_api_url, token, sample_id)

            sequencing_date = sample_data.get("sequencing_date")

            if sequencing_date and "T" in sequencing_date:
                date_part, time_part = sequencing_date.split("T")
            else:
                date_part = sequencing_date
                time_part = None

            pipeline = sample_data.get("pipeline", {})

            pipeline_version = pipeline.get("version")

            pipeline_date_full = pipeline.get("date")

            if pipeline_date_full and "T" in pipeline_date_full:
                pipeline_date = pipeline_date_full.split("T")[0]
            else:
                pipeline_date = pipeline_date_full

            analysis_profile = pipeline.get("analysis_profile")

            metadata_row = {
                "sample": sample_id,
                "lims_id": normalise_missing(sample_data.get("lims_id")),
                "Date": normalise_missing(date_part),
                "Time": normalise_missing(time_part),
                "Pipeline_Version": normalise_missing(pipeline_version),
                "Pipeline_Date": normalise_missing(pipeline_date),
                "Profile": normalise_missing(analysis_profile),
                "QC_Status": normalise_missing(
                    sample_data.get("qc_status", {}).get("status")
                ),
            }

            if (analysis_profile or "").lower() in {
                "staphylococcus_aureus",
                "klebsiella_pneumoniae",
            }:
                mlst = next(
                    (
                        r
                        for r in sample_data.get("typing_result", [])
                        if r.get("type") == "mlst"
                    ),
                    {},
                )

                metadata_row["ST"] = normalise_missing(
                    mlst.get("result", {}).get("sequence_type")
                )

                for gene, allele in mlst.get("result", {}).get("alleles", {}).items():
                    metadata_row[gene] = allele

            cgmlst = next(
                (
                    r
                    for r in sample_data.get("typing_result", [])
                    if r.get("type", "").lower() == "cgmlst"
                ),
                None,
            )

            if cgmlst:
                allele_row = {"sample": sample_id}
                allele_row.update(cgmlst.get("result", {}).get("alleles", {}))
                cgmlst_frames.append(pd.DataFrame([allele_row]))
            else:
                print(f"No cgMLST data found for sample {sample_id}")

            metadata_rows.append(metadata_row)

        metadata_df = pd.DataFrame(metadata_rows)

        full_metadata_file = os.path.join(
            output_folder,
            f"metadata_{profile}.tsv",
        )
        metadata_df.to_csv(full_metadata_file, sep="\t", index=False)

        missing = set(REPORTREE_SAFE_COLUMNS) - set(metadata_df.columns)
        if missing:
            raise RuntimeError(f"Missing required ReporTree-safe columns: {missing}")

        reportree_safe_metadata_file = os.path.join(
            output_folder,
            f"metadata_{profile}_reportree_safe.tsv",
        )
        metadata_df[REPORTREE_SAFE_COLUMNS].to_csv(
            reportree_safe_metadata_file,
            sep="\t",
            index=False,
        )

        metadata_files.append(
            {
                "full": full_metadata_file,
                "reportree_safe": reportree_safe_metadata_file,
            }
        )

        if cgmlst_frames:
            cgmlst_df = pd.concat(cgmlst_frames, ignore_index=True)
            missing_codes = {
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
            }
            cgmlst_df.replace(missing_codes, "0", inplace=True)

            cgmlst_file = os.path.join(
                output_folder,
                f"cgmlst_{profile}.tsv",
            )
            cgmlst_df.to_csv(cgmlst_file, sep="\t", index=False)
            cgmlst_files.append(cgmlst_file)
        else:
            print(f"No cgMLST data collected for profile {profile}")

    return metadata_files, cgmlst_files
