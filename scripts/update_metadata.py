#!/usr/bin/env python3
import os
import pandas as pd

def update_metadata_with_supplementary_metadata(metadata_file, supplementary_metadata_file):
    """Update the metadata file in place by adding PostCode, Hospital, and conditionally updating Date. 
    The Date column is updated only if the original value is missing, empty, or 'Unknown'.
    """
    if not os.path.exists(supplementary_metadata_file):
        print(f"Error: PostCode file '{supplementary_metadata_file}' not found. Skipping merge.")
        return

    metadata_df = pd.read_csv(metadata_file, sep='\t', dtype={"PostCode": str})
    postcode_df = pd.read_csv(supplementary_metadata_file, dtype={"PostCode": str})

    postcode_df['PostCode'] = postcode_df['PostCode'].apply(
         lambda x: f'SE-{x}' if pd.notnull(x) and not str(x).startswith('SE-') else x
     )

    merged_df = metadata_df.merge(
        postcode_df[['sample', 'lims_id', 'PostCode', 'Hospital', 'Date']],
        on=['sample', 'lims_id'],
        how='left',
        suffixes=('_old', '_new')
    )

    if 'Date_old' in merged_df.columns:
        merged_df['Date'] = merged_df['Date_old']
        mask = merged_df['Date'].isna() | \
               (merged_df['Date'].astype(str).str.strip() == '') | \
               (merged_df['Date'].astype(str).str.lower() == 'unknown')
        merged_df.loc[mask, 'Date'] = merged_df.loc[mask, 'Date_new']
        merged_df.drop(columns=['Date_old', 'Date_new'], inplace=True)

    merged_df.to_csv(metadata_file, sep='\t', index=False)
    print("Metadata updated with PostCode & Hospital")

