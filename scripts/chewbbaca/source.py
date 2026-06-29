#!/usr/bin/env python3
import csv
import os
from pathlib import Path

from .tsv import infer_sample_id, parse_chewbbaca_tsv

CHEWBBACA_SAMPLE_SUFFIXES = ("_chewbbaca",)


def _sample_ids(samples):
    return [sample["sample_id"] for sample in samples]


def _candidate_ids(sample_id, path=None, include_path=True):
    candidates = []
    sample_id = str(sample_id).strip()
    if sample_id:
        candidates.append(sample_id)
        for suffix in CHEWBBACA_SAMPLE_SUFFIXES:
            if sample_id.endswith(suffix):
                candidates.append(sample_id[: -len(suffix)])

    if include_path and path:
        inferred = infer_sample_id(path)
        if inferred:
            candidates.append(inferred)

    deduped = []
    for candidate in candidates:
        if candidate and candidate not in deduped:
            deduped.append(candidate)
    return deduped


def _annotate_samples(samples, path, include_path_candidate=True):
    annotated = []
    for sample in samples:
        sample = dict(sample)
        sample["source_path"] = str(path)
        sample["bonsai_id_candidates"] = _candidate_ids(
            sample["sample_id"],
            path=path,
            include_path=include_path_candidate,
        )
        annotated.append(sample)
    return annotated


def _with_manifest_id(samples, manifest_id):
    if not manifest_id or len(samples) != 1:
        return samples

    sample = dict(samples[0])
    sample["sample_id"] = manifest_id
    sample["bonsai_id_candidates"] = _candidate_ids(
        manifest_id,
        include_path=False,
    )
    return [sample]


def collect_chewbbaca_inputs(input_path, profile=None):
    """
    Parse a single chewBBACA TSV, a directory of TSVs, or a CSV manifest.
    Returns {"samples": [...], "outcomes": [...]} with parsed sample objects and per-entry outcome records.
    """
    path = Path(input_path)
    if not path.exists():
        raise FileNotFoundError(f"chewBBACA input does not exist: {input_path}")

    if path.is_dir():
        result = collect_chewbbaca_directory(path)
    elif path.suffix.lower() == ".csv":
        result = collect_chewbbaca_manifest(path, default_profile=profile)
    elif path.suffix.lower() == ".tsv":
        result = collect_chewbbaca_file(path)
    else:
        raise ValueError(
            "chewBBACA input must be a TSV file, directory, or CSV manifest: "
            f"{input_path}"
        )

    if profile:
        for sample in result["samples"]:
            sample.setdefault("analysis_profile", profile)

    return result


def collect_chewbbaca_file(path):
    samples = _annotate_samples(parse_chewbbaca_tsv(path), path)
    return {
        "samples": samples,
        "outcomes": [
            {
                "input": str(path),
                "status": "parsed",
                "samples": _sample_ids(samples),
            }
        ],
    }


def collect_chewbbaca_directory(path):
    samples = []
    outcomes = []
    tsv_paths = sorted(p for p in path.iterdir() if p.suffix.lower() == ".tsv")

    for tsv_path in tsv_paths:
        try:
            parsed = _annotate_samples(parse_chewbbaca_tsv(tsv_path), tsv_path)
        except Exception as err:
            outcomes.append(
                {
                    "input": str(tsv_path),
                    "status": "failed",
                    "error": str(err),
                }
            )
            continue

        samples.extend(parsed)
        outcomes.append(
            {
                "input": str(tsv_path),
                "status": "parsed",
                "samples": _sample_ids(parsed),
            }
        )

    return {"samples": samples, "outcomes": outcomes}


def collect_chewbbaca_manifest(path, default_profile=None):
    samples = []
    outcomes = []

    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError(f"CSV manifest is empty: {path}")

        fields = {field.strip().lower(): field for field in reader.fieldnames}
        id_field = fields.get("id") or fields.get("sample_id") or fields.get("sample")
        file_field = fields.get("file_path") or fields.get("path") or fields.get("file")
        profile_field = fields.get("profile") or fields.get("analysis_profile")
        if not file_field:
            raise ValueError(
                "CSV manifest must contain a file_path, path, or file column."
            )

        for row_number, row in enumerate(reader, start=2):
            manifest_id = row.get(id_field, "").strip() if id_field else ""
            file_path = row.get(file_field, "").strip()
            row_profile = row.get(profile_field, "").strip() if profile_field else ""
            sample_profile = row_profile or default_profile
            if not file_path:
                outcomes.append(
                    {
                        "input": str(path),
                        "row": row_number,
                        "status": "skipped",
                        "reason": "missing_file_path",
                        "manifest_id": manifest_id,
                    }
                )
                continue

            if not os.path.exists(file_path):
                outcomes.append(
                    {
                        "input": file_path,
                        "row": row_number,
                        "status": "skipped",
                        "reason": "file_not_found",
                        "manifest_id": manifest_id,
                    }
                )
                continue

            try:
                parsed = _annotate_samples(
                    parse_chewbbaca_tsv(file_path),
                    file_path,
                    include_path_candidate=False,
                )
            except Exception as err:
                outcomes.append(
                    {
                        "input": file_path,
                        "row": row_number,
                        "status": "failed",
                        "error": str(err),
                        "manifest_id": manifest_id,
                    }
                )
                continue

            status = "parsed"
            if manifest_id and len(parsed) == 1:
                parsed = _with_manifest_id(parsed, manifest_id)
                status = "parsed_manifest_id_applied"
            elif manifest_id and len(parsed) > 1:
                status = "parsed_manifest_id_ignored_multi_sample"

            if sample_profile:
                for sample in parsed:
                    sample.setdefault("analysis_profile", sample_profile)

            samples.extend(parsed)
            outcomes.append(
                {
                    "input": file_path,
                    "row": row_number,
                    "status": status,
                    "manifest_id": manifest_id,
                    "samples": _sample_ids(parsed),
                }
            )

    return {"samples": samples, "outcomes": outcomes}
