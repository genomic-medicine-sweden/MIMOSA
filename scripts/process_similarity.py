#!/usr/bin/env python3
import time
import datetime
import requests
import json
import os
from api import fetch_samples

def submit_similarity_job(bonsai_api_url, token, sample_id):
    url = f"{bonsai_api_url}/samples/{sample_id}/similar"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "limit": 10,
        "similarity": 0.5,
        "cluster": False,
        "typing_method": "mlst",
        "cluster_method": "single"
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json().get("id")

def get_job_status(bonsai_api_url, token, job_id):
    url = f"{bonsai_api_url}/job/status/{job_id}"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def process_similarity(bonsai_api_url, token, sample_ids, output_dir, profile, poll_interval=3, max_attempts=10, save_files=False):
    """
    Submit similarity jobs for a list of samples, poll results, and return them.
    Optionally saves to a JSON file if save_files=True.
    """
    similarity = []
    for sample in sample_ids:
        print(f"\nSubmitting similarity job for sample: {sample}")
        try:
            job_id = submit_similarity_job(bonsai_api_url, token, sample)

            job_status = None
            for attempt in range(max_attempts):
                job_status = get_job_status(bonsai_api_url, token, job_id)
                if job_status.get("status") in ["completed", "finished"]:
                    break
                time.sleep(poll_interval)

            similar_list = []
            if job_status.get("result"):
                for entry in job_status["result"]:
                    similar_list.append({
                        "ID": entry.get("sample_id"),
                        "similarity": entry.get("similarity")
                    })

            similarity.append({
                "ID": sample,
                "similar": similar_list,
                "createdAt": datetime.datetime.utcnow().isoformat()
            })
        except Exception as e:
            print(f"Error processing sample {sample}: {e}")
            similarity.append({
                "ID": sample,
                "similar": [],
                "createdAt": datetime.datetime.utcnow().isoformat()
            })

    if save_files:
        output_path = os.path.join(output_dir, f"{profile}_similarity.json")
        with open(output_path, "w") as outfile:
            json.dump(similarity, outfile, indent=2)

    return similarity

