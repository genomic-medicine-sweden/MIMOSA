#!/usr/bin/env python3
import os
import subprocess

def run_reportree(metadata_file, cgmlst_file, output_folder, analysis_profile):
    """
    Run ReporTree using Docker.
    Options, like -thr and --method, are chosen based on the analysis profile.
    """
    # Define options for different profiles; adjust as needed.
    if analysis_profile == "staphylococcus_aureus":
        thr = 9
        method = "MSTreeV2"
        analysis = "grapetree"
    else:
        thr = 9
        method = "MSTreeV2"
        analysis = "grapetree"

    os.makedirs(output_folder, exist_ok=True)
    output_dir = "/data/"
    command = [
        "docker", "run", "--rm",
        "-v", f"{os.path.abspath(output_folder)}:/data",
        "insapathogenomics/reportree:v2.5.4",
        "bash", "-c",
        f"mkdir -p {output_dir} && reportree.py -m /data/{os.path.basename(metadata_file)} "
        f"-a /data/{os.path.basename(cgmlst_file)} -out {output_dir}/{analysis_profile} --analysis {analysis} "
        f"--method {method} -thr {thr}"
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"ReporTree successfully completed for {analysis_profile}")
    else:
        print(f"ReporTree encountered an error for {analysis_profile}")

