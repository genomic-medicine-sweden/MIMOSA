#!/usr/bin/env python3
import glob
import hashlib
import os
from pathlib import Path

import pandas as pd

from constants import CGMLST_MISSING_CODES

SAMPLE_COLUMNS = {"file", "filename", "sample", "sample_id", "isolate", "id"}
LOCUS_COLUMNS = {"locus", "gene", "gene_id", "locus_id", "schema", "name"}
ALLELE_COLUMNS = {
    "allele",
    "allele_id",
    "allele_call",
    "allelecall",
    "allele_number",
    "result",
    "value",
}


def expand_paths(paths):
    expanded = []
    for path in paths or []:
        matches = glob.glob(path)
        expanded.extend(matches if matches else [path])

    missing = [path for path in expanded if not os.path.exists(path)]
    if missing:
        raise FileNotFoundError(
            "Could not find input file(s): " + ", ".join(sorted(missing))
        )
    return expanded


def hash_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def infer_sample_id(path):
    stem = Path(path).stem
    for suffix in (
        "_chewbbaca",
        "_results_alleles",
        "_alleles",
    ):
        if stem.endswith(suffix):
            return stem[: -len(suffix)]
    return stem


def normalise_column_name(value):
    return str(value).strip().lower().lstrip("#").replace(" ", "_")


def normalise_allele_value(value):
    if value is None:
        return "0"

    value = str(value).strip()
    if not value or value.lower() in {"nan", "none", "null"}:
        return "0"
    if value.upper() in CGMLST_MISSING_CODES:
        return "0"
    return value


def build_sample(sample_id, alleles):
    sample_id = str(sample_id).strip()
    if not sample_id:
        raise ValueError("chewBBACA TSV contains a row with an empty sample ID.")
    return {"sample_id": sample_id, "alleles": alleles}


def validate_samples(samples, path):
    if not samples:
        raise ValueError(f"{path} does not contain any chewBBACA sample rows.")

    seen = set()
    for sample in samples:
        sample_id = sample.get("sample_id", "").strip()
        if not sample_id:
            raise ValueError(f"{path} contains a row with an empty sample ID.")
        if sample_id in seen:
            raise ValueError(f"{path} contains duplicate sample ID {sample_id}.")
        seen.add(sample_id)
        if not sample.get("alleles"):
            raise ValueError(
                f"{path} does not contain any allele columns for sample {sample_id}."
            )

    return samples


def parse_long_chewbbaca(df, fallback_sample_id):
    normalised_columns = {normalise_column_name(c): c for c in df.columns}
    sample_col = next(
        (
            normalised_columns[name]
            for name in SAMPLE_COLUMNS
            if name in normalised_columns
        ),
        None,
    )
    locus_col = next(
        (
            normalised_columns[name]
            for name in LOCUS_COLUMNS
            if name in normalised_columns
        ),
        None,
    )
    allele_col = next(
        (
            normalised_columns[name]
            for name in ALLELE_COLUMNS
            if name in normalised_columns
        ),
        None,
    )

    if locus_col is None or allele_col is None:
        return None

    samples = {}
    for _, row in df.iterrows():
        sample_id = fallback_sample_id
        if sample_col is not None:
            sample_id = str(row[sample_col]).strip()

        locus = str(row[locus_col]).strip()
        if not locus:
            continue
        samples.setdefault(sample_id, {})[locus] = normalise_allele_value(
            row[allele_col]
        )

    return [build_sample(sample_id, alleles) for sample_id, alleles in samples.items()]


def parse_headerless_two_column(path, fallback_sample_id):
    df = pd.read_csv(path, sep="\t", header=None, dtype=str, keep_default_na=False)
    if df.empty or len(df.columns) < 2:
        raise ValueError(f"{path} must contain a locus column and an allele column.")

    alleles = {}
    for _, row in df.iterrows():
        locus = str(row.iloc[0]).strip()
        allele = str(row.iloc[1]).strip()
        if (
            normalise_column_name(locus) in LOCUS_COLUMNS
            and normalise_column_name(allele) in ALLELE_COLUMNS
        ):
            continue
        if locus:
            alleles[locus] = normalise_allele_value(allele)
    return [build_sample(fallback_sample_id, alleles)]


def parse_wide_chewbbaca(df, fallback_sample_id):
    if df.empty:
        raise ValueError("chewBBACA TSV does not contain any sample rows.")
    if len(df.columns) < 2:
        raise ValueError(
            "chewBBACA TSV must contain a sample column and at least one locus column."
        )

    first_col = df.columns[0]
    use_first_column_as_sample = (
        normalise_column_name(first_col) in SAMPLE_COLUMNS or len(df.index) > 1
    )
    if use_first_column_as_sample:
        allele_columns = list(df.columns[1:])
    else:
        allele_columns = list(df.columns)

    if not allele_columns:
        raise ValueError("chewBBACA TSV must contain at least one locus column.")

    samples = []
    for _, row in df.iterrows():
        sample_id = (
            str(row[first_col]).strip()
            if use_first_column_as_sample
            else fallback_sample_id
        )
        alleles = {
            str(column).strip(): normalise_allele_value(row[column])
            for column in allele_columns
            if str(column).strip()
        }
        samples.append(build_sample(sample_id, alleles))

    return samples


def parse_chewbbaca_tsv(path):
    fallback_sample_id = infer_sample_id(path)
    try:
        df = pd.read_csv(path, sep="\t", dtype=str, keep_default_na=False)
    except pd.errors.EmptyDataError as err:
        raise ValueError(
            f"{path} is empty and cannot be parsed as chewBBACA TSV."
        ) from err

    long_result = parse_long_chewbbaca(df, fallback_sample_id)
    if long_result is not None:
        return validate_samples(long_result, path)

    if (
        len(df.columns) == 2
        and normalise_column_name(df.columns[0]) not in SAMPLE_COLUMNS
    ):
        return validate_samples(
            parse_headerless_two_column(path, fallback_sample_id),
            path,
        )

    return validate_samples(parse_wide_chewbbaca(df, fallback_sample_id), path)
