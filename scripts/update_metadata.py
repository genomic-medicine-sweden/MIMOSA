#!/usr/bin/env python3
import os
import pandas as pd

SUPP_FIELDS = ["PostCode", "Hospital", "Date", "Latitude", "Longitude"]


def update_metadata_with_supplementary_metadata(
    metadata_file, supplementary_metadata_file
):
    """
    Update the metadata file in place by merging PostCode, Hospital, Date,
    Latitude, and Longitude from the supplementary metadata CSV.
    Matches by lims_id first (Bonsai samples), then falls back to sample ID.
    Date is only updated if the original value is missing, empty, or 'Unknown'.
    """
    if not os.path.exists(supplementary_metadata_file):
        print(
            f"Error: Supplementary metadata file '{supplementary_metadata_file}' not found. Skipping merge."
        )
        return

    metadata_df = pd.read_csv(metadata_file, sep="\t", dtype={"PostCode": str})
    supp_df = pd.read_csv(supplementary_metadata_file, dtype={"PostCode": str})

    supp_df["PostCode"] = supp_df["PostCode"].apply(
        lambda x: f"SE-{x}" if pd.notnull(x) and not str(x).startswith("SE-") else x
    )

    active_fields = [f for f in SUPP_FIELDS if f in supp_df.columns]

    if "lims_id" in supp_df.columns and "lims_id" in metadata_df.columns:
        lims_supp = supp_df[supp_df["lims_id"].notna()][
            ["lims_id"] + active_fields
        ].rename(columns={f: f"{f}_lims" for f in active_fields})
        merged = metadata_df.merge(lims_supp, on="lims_id", how="left")
    else:
        merged = metadata_df.copy()
        for f in active_fields:
            merged[f"{f}_lims"] = pd.NA

    if "sample" in supp_df.columns:
        sample_supp = supp_df[["sample"] + active_fields].rename(
            columns={f: f"{f}_sample" for f in active_fields}
        )
        merged = merged.merge(sample_supp, on="sample", how="left")
    else:
        for f in active_fields:
            merged[f"{f}_sample"] = pd.NA

    for f in ["PostCode", "Hospital", "Latitude", "Longitude"]:
        if f not in active_fields:
            continue
        merged[f] = merged[f"{f}_lims"].fillna(merged[f"{f}_sample"])

    if "Date" in active_fields:
        date_from_supp = merged["Date_lims"].fillna(merged["Date_sample"])
        is_missing_date = (
            merged["Date"].isna()
            | (merged["Date"].astype(str).str.strip() == "")
            | (merged["Date"].astype(str).str.lower() == "unknown")
        )
        merged.loc[is_missing_date, "Date"] = date_from_supp[is_missing_date]

    merged.drop(
        columns=[f"{f}_{s}" for f in active_fields for s in ("lims", "sample")],
        inplace=True,
    )

    merged.to_csv(metadata_file, sep="\t", index=False)
    print("Metadata updated with supplementary fields")
