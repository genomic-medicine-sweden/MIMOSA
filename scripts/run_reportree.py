#!/usr/bin/env python3
import logging
import os
import shutil
import subprocess

from config import get_reportree_params

log = logging.getLogger(__name__)


def run_reportree(
    metadata_file,
    cgmlst_file,
    output_folder,
    analysis_profile,
    save_files=False,
    nomenclature_file=None,
):
    os.makedirs(output_folder, exist_ok=True)

    metadata_basename = os.path.basename(metadata_file)
    cgmlst_basename = os.path.basename(cgmlst_file)

    local_metadata = os.path.join(output_folder, metadata_basename)
    local_cgmlst = os.path.join(output_folder, cgmlst_basename)

    if os.path.abspath(metadata_file) != os.path.abspath(local_metadata):
        shutil.copy2(metadata_file, local_metadata)

    if os.path.abspath(cgmlst_file) != os.path.abspath(local_cgmlst):
        shutil.copy2(cgmlst_file, local_cgmlst)

    params = get_reportree_params(analysis_profile)

    thr = params["threshold"]
    method = params["method"]
    analysis = params["analysis"]

    if analysis.lower() == "hc":
        method = method.lower()

        if method not in ("single", "complete"):
            raise ValueError(
                f"Unsupported HC method: {method}. "
                "Supported methods: single, complete."
            )

        clustering_args = [
            "--analysis",
            "HC",
            "--HC-threshold",
            f"{method}-{thr}",
        ]

    elif analysis.lower() == "grapetree":
        clustering_args = [
            "--analysis",
            "grapetree",
            "--method",
            method,
            "-thr",
            str(thr),
        ]

    else:
        raise ValueError(
            f"Unsupported ReporTree analysis: {analysis}. "
            "Supported analyses: grapetree, HC."
        )

    output_prefix = os.path.join(output_folder, analysis_profile)

    log.info(
        "Running ReporTree for %s " "(analysis=%s, method=%s, threshold=%s)...",
        analysis_profile,
        analysis,
        method,
        thr,
    )

    if shutil.which("reportree.py"):
        command = [
            "reportree.py",
            "-m",
            local_metadata,
            "-a",
            local_cgmlst,
            "-out",
            output_prefix,
            *clustering_args,
            "--keep-redundants",
        ]

        if nomenclature_file:
            command += [
                "--nomenclature-file",
                nomenclature_file,
            ]

    else:
        nomenclature_basename = (
            os.path.basename(nomenclature_file) if nomenclature_file else None
        )

        if nomenclature_basename:
            local_nomenclature = os.path.join(
                output_folder,
                nomenclature_basename,
            )

            if os.path.abspath(nomenclature_file) != os.path.abspath(
                local_nomenclature
            ):
                shutil.copy2(nomenclature_file, local_nomenclature)

        command = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{os.path.abspath(output_folder)}:/data",
            "insapathogenomics/reportree:v2.5.4",
            "reportree.py",
            "-m",
            f"/data/{metadata_basename}",
            "-a",
            f"/data/{cgmlst_basename}",
            "-out",
            f"/data/{analysis_profile}",
            *clustering_args,
            "--keep-redundants",
        ]

        if nomenclature_basename:
            command += [
                "--nomenclature-file",
                f"/data/{nomenclature_basename}",
            ]

    log.debug("ReporTree command: %s", command)

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        log.info(
            "ReporTree completed for %s",
            analysis_profile,
        )

    else:
        log.error(
            "ReporTree failed for %s:\n%s",
            analysis_profile,
            result.stderr,
        )

        raise subprocess.CalledProcessError(
            result.returncode,
            command,
            output=result.stdout,
            stderr=result.stderr,
        )

    return output_folder
