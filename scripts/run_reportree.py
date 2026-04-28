#!/usr/bin/env python3
import os
import shutil
import subprocess

from constants import get_reportree_params


def run_reportree(
    metadata_file,
    cgmlst_file,
    output_folder,
    analysis_profile,
    save_files=False,
    nomenclature_file=None,
):
    """
    Run ReporTree.

    """
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

    output_prefix = os.path.join(output_folder, analysis_profile)

    print(f"Running ReporTree for {analysis_profile}...")

    if shutil.which("reportree.py"):
        command = [
            "reportree.py",
            "-m",
            local_metadata,
            "-a",
            local_cgmlst,
            "-out",
            output_prefix,
            "--analysis",
            analysis,
            "--method",
            method,
            "-thr",
            str(thr),
            "--keep-redundants",
        ]
        if nomenclature_file:
            command += ["--nomenclature-file", nomenclature_file]
    else:
        nomenclature_basename = (
            os.path.basename(nomenclature_file) if nomenclature_file else None
        )
        if nomenclature_file and nomenclature_basename:
            local_nomenclature = os.path.join(output_folder, nomenclature_basename)
            if os.path.abspath(nomenclature_file) != os.path.abspath(
                local_nomenclature
            ):
                shutil.copy2(nomenclature_file, local_nomenclature)

        nomenclature_arg = (
            f" --nomenclature-file /data/{nomenclature_basename}"
            if nomenclature_basename
            else ""
        )

        command = [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{os.path.abspath(output_folder)}:/data",
            "insapathogenomics/reportree:v2.5.4",
            "bash",
            "-c",
            f"reportree.py "
            f"-m /data/{metadata_basename} "
            f"-a /data/{cgmlst_basename} "
            f"-out /data/{analysis_profile} "
            f"--analysis {analysis} --method {method} -thr {thr} --keep-redundants"
            f"{nomenclature_arg}",
        ]

    result = subprocess.run(command, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"ReporTree completed for {analysis_profile}")
    else:
        print(f"ReporTree failed for {analysis_profile}:\n{result.stderr}")
        raise subprocess.CalledProcessError(
            result.returncode, command, output=result.stdout, stderr=result.stderr
        )

    return output_folder
