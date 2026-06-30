#!/usr/bin/env python3
import os
import pandas as pd

SUPP_FIELDS = ["PostCode", "Hospital", "Date"]


def update_metadata_with_supplementary_metadata(
    metadata_file, supplementary_metadata_file
):
    """
    Update the metadata file in place by adding PostCode, Hospital, and conditionally updating Date.
    Matches by lims_id first (Bonsai samples), then falls back to sample ID (chewBBACA or unmatched).
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

    if "lims_id" in supp_df.columns and "lims_id" in metadata_df.columns:
        lims_supp = supp_df[supp_df["lims_id"].notna()][
            ["lims_id"] + SUPP_FIELDS
        ].rename(columns={f: f"{f}_lims" for f in SUPP_FIELDS})
        merged = metadata_df.merge(lims_supp, on="lims_id", how="left")
    else:
        merged = metadata_df.copy()
        for f in SUPP_FIELDS:
            merged[f"{f}_lims"] = pd.NA

    if "sample" in supp_df.columns:
        sample_supp = supp_df[["sample"] + SUPP_FIELDS].rename(
            columns={f: f"{f}_sample" for f in SUPP_FIELDS}
        )
        merged = merged.merge(sample_supp, on="sample", how="left")
    else:
        for f in SUPP_FIELDS:
            merged[f"{f}_sample"] = pd.NA

    merged["PostCode"] = merged["PostCode_lims"].fillna(merged["PostCode_sample"])
    merged["Hospital"] = merged["Hospital_lims"].fillna(merged["Hospital_sample"])

    date_from_supp = merged["Date_lims"].fillna(merged["Date_sample"])
    is_missing_date = (
        merged["Date"].isna()
        | (merged["Date"].astype(str).str.strip() == "")
        | (merged["Date"].astype(str).str.lower() == "unknown")
    )
    merged.loc[is_missing_date, "Date"] = date_from_supp[is_missing_date]

    merged.drop(
        columns=[f"{f}_{s}" for f in SUPP_FIELDS for s in ("lims", "sample")],
        inplace=True,
    )

    merged.to_csv(metadata_file, sep="\t", index=False)
    print("Metadata updated with PostCode & Hospital")
