#!/usr/bin/env python3
import time
import requests
import json
import os

def submit_similarity_job(api_url, token, sample_id):
    """
    Submit a similarity job for a given sample.
    """
    url = f"{api_url}/samples/{sample_id}/similar"
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
    job_info = response.json()
    return job_info.get("id")

def get_job_status(api_url, token, job_id):
    """
    Retrieve the status of a submitted job using its job ID.
    """
    url = f"{api_url}/job/status/{job_id}"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def process_similarity(api_url, token, sample_ids, output_dir, profile, poll_interval=3, max_attempts=10):
    """
    Loop over each sample, submit a similarity job, and poll for its status.
    The results are then re-structured to work with the db schema.
    """
    similarity = []
    for sample in sample_ids:
        print(f"\nSubmitting similarity job for sample: {sample}")
        try:
            # Submit similarity job for the sample
            job_id = submit_similarity_job(api_url, token, sample)

            # Poll for the job status (up to max_attempts)
            job_status = None
            for attempt in range(max_attempts):
                job_status = get_job_status(api_url, token, job_id)
                if job_status.get("status") in ["completed", "finished"]:
                    break
                time.sleep(poll_interval)

            # Structure the similarity result
            similar_list = []
            if job_status.get("result"):
                for entry in job_status["result"]:
                    similar_list.append({
                        "ID": entry.get("sample_id"),
                        "similarity": entry.get("similarity")
                    })
            similarity.append({
                "ID": sample, 
                "similar": similar_list
            })
        except Exception as e:
            print(f"Error processing sample {sample}: {e}")
            similarity.append({
                "ID": sample,
                "similar": []
            })

    filename = f"{profile}_similarity.json"
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w") as outfile:
        json.dump(similarity, outfile, indent=2)
    print(f"Successfully processed similarity results")
    return similarity

