#!/usr/bin/env python3
import os
import shutil
import subprocess

def run_reportree(metadata_file, cgmlst_file, output_folder, analysis_profile, save_files=False):
    """
    ReporTree. 
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

    thr = 9
    method = "MSTreeV2"
    analysis = "grapetree"

    docker_command = [
        "docker", "run", "--rm",
        "-v", f"{os.path.abspath(output_folder)}:/data",
        "insapathogenomics/reportree:v2.5.4",
        "bash", "-c",
        f"mkdir -p /data && reportree.py "
        f"-m /data/{metadata_basename} "
        f"-a /data/{cgmlst_basename} "
        f"-out /data/{analysis_profile} "
        f"--analysis {analysis} --method {method} -thr {thr}"
    ]

    print(f"Running ReporTree for {analysis_profile}…")
    result = subprocess.run(docker_command, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"ReporTree completed for {analysis_profile}")
    else:
        print(f"ReporTree failed for {analysis_profile}:\n{result.stderr}")

    return output_folder
