#!/usr/bin/env python3
import os
import pandas as pd
from api import fetch_samples, fetch_sample_details
from constants import AVAILABLE_PROFILES, CGMLST_MISSING_CODES

REPORTREE_SAFE_COLUMNS = [
    "sample",
    "Profile",
    "Pipeline_Version",
    "Pipeline_Date",
]


def normalise_missing(value):
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
    sample_ids=None,
    run_clustering=True,
    chewbbaca_profiles=None,
):
    os.makedirs(output_folder, exist_ok=True)

    chewbbaca_sample_ids = {doc["sample_id"] for doc in (chewbbaca_profiles or [])}

    bonsai_profile_map = {}
    if bonsai_api_url and token:
        bonsai_samples = fetch_samples(bonsai_api_url, token)
        for sample in bonsai_samples:
            profile = sample.get("profile")
            sid = sample.get("sample_id")
            if not sid or not profile:
                continue
            if sid in chewbbaca_sample_ids:
                continue
            if target_profiles is None or profile in target_profiles:
                if sample_ids is None or sid in sample_ids:
                    bonsai_profile_map.setdefault(profile, []).append(sid)

    chewbbaca_profile_map = {}
    if chewbbaca_profiles:
        for doc in chewbbaca_profiles:
            profile = doc.get("analysis_profile")
            sid = doc.get("sample_id")
            if not profile or not sid:
                continue
            if target_profiles is None or profile in target_profiles:
                if sample_ids is None or sid in sample_ids:
                    chewbbaca_profile_map.setdefault(profile, []).append(doc)

    all_profiles = set(bonsai_profile_map) | set(chewbbaca_profile_map)
    if not all_profiles:
        print("No samples match the specified profiles. Exiting.", flush=True)
        return None, None

    metadata_files = []
    cgmlst_files = []

    for profile in sorted(all_profiles):
        bonsai_ids = bonsai_profile_map.get(profile, [])
        chewbbaca_docs = chewbbaca_profile_map.get(profile, [])
        total = len(bonsai_ids) + len(chewbbaca_docs)

        if run_clustering:
            print(
                f"\nProcessing profile: {profile} with {total} samples",
                flush=True,
            )
        else:
            print(
                f"\nChecking for metadata updates for {profile} with {total} samples",
                flush=True,
            )

        metadata_rows = []
        cgmlst_frames = []

        for sid in bonsai_ids:
            sample_data = fetch_sample_details(bonsai_api_url, token, sid)

            qc_status = normalise_missing(
                sample_data.get("qc_status", {}).get("status")
            )

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
                "sample": sid,
                "lims_id": normalise_missing(sample_data.get("lims_id")),
                "Date": normalise_missing(date_part),
                "Time": normalise_missing(time_part),
                "Pipeline_Version": normalise_missing(pipeline_version),
                "Pipeline_Date": normalise_missing(pipeline_date),
                "Profile": normalise_missing(analysis_profile),
                "QC_Status": qc_status,
                "Sequencing_Platform": normalise_missing(
                    sample_data.get("sequencing", {}).get("platform")
                ),
                "source": "bonsai",
            }

            if (analysis_profile or "").lower() in set(AVAILABLE_PROFILES):
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
                allele_row = {"sample": sid}
                allele_row.update(cgmlst.get("result", {}).get("alleles", {}))
                cgmlst_frames.append(pd.DataFrame([allele_row]))
            else:
                print(f"No cgMLST data found for sample {sid}", flush=True)

            metadata_rows.append(metadata_row)

        for doc in chewbbaca_docs:
            sid = doc["sample_id"]
            alleles = doc.get("alleles", {})

            metadata_row = {
                "sample": sid,
                "lims_id": None,
                "Date": None,
                "Time": None,
                "Pipeline_Version": None,
                "Pipeline_Date": None,
                "Profile": profile,
                "QC_Status": None,
                "Sequencing_Platform": None,
                "source": "chewbbaca",
            }
            metadata_rows.append(metadata_row)

            allele_row = {"sample": sid}
            allele_row.update(alleles)
            cgmlst_frames.append(pd.DataFrame([allele_row]))

        metadata_df = pd.DataFrame(metadata_rows)

        full_metadata_file = os.path.join(
            output_folder,
            f"metadata_{profile}.tsv",
        )
        metadata_df.to_csv(full_metadata_file, sep="\t", index=False)

        missing = set(REPORTREE_SAFE_COLUMNS) - set(metadata_df.columns)
        if missing:
            raise RuntimeError(f"Missing required ReporTree columns: {missing}")

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
            cgmlst_df.replace(CGMLST_MISSING_CODES, "0", inplace=True)

            cgmlst_file = os.path.join(
                output_folder,
                f"cgmlst_{profile}.tsv",
            )
            cgmlst_df.to_csv(cgmlst_file, sep="\t", index=False)
            cgmlst_files.append(cgmlst_file)
        else:
            print(f"No cgMLST data collected for profile {profile}", flush=True)

    return metadata_files, cgmlst_files
