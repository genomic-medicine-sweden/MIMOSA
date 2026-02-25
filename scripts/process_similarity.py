#!/usr/bin/env python3
import time
import datetime
import requests
import json
import os


def submit_similarity_job(bonsai_api_url, token, sample_id):
    url = f"{bonsai_api_url}/samples/{sample_id}/similar"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = {
        "limit": 10,
        "similarity": 0.5,
        "cluster": False,
        "typing_method": "mlst",
        "cluster_method": "single",
    }

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json().get("id")


def get_job_status(bonsai_api_url, token, job_id):
    url = f"{bonsai_api_url}/job/status/{job_id}"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()


def process_similarity(
    bonsai_api_url,
    token,
    sample_ids,
    output_dir,
    profile,
    poll_interval=3,
    max_attempts=10,
    save_files=False,
    progress_callback=None,
):
    """
    Submit similarity jobs for a list of samples
    """

    similarity = []

    seen_samples = set()
    unique_sample_ids = []
    for sample_id in sample_ids:
        if sample_id not in seen_samples:
            seen_samples.add(sample_id)
            unique_sample_ids.append(sample_id)

    for sample in unique_sample_ids:
        if progress_callback:
            progress_callback()
        else:
            print(f"\nSubmitting similarity job for sample: {sample}")

        try:
            job_id = submit_similarity_job(bonsai_api_url, token, sample)

            job_status = None
            for _ in range(max_attempts):
                job_status = get_job_status(bonsai_api_url, token, job_id)
                if job_status.get("status") in ("completed", "finished"):
                    break
                time.sleep(poll_interval)

            similar_list = []
            seen_similar_ids = set()

            results = job_status.get("result") if job_status else None

            if results:
                for entry in results:
                    similar_id = entry.get("sample_id")

                    if not similar_id:
                        continue

                    if similar_id == sample:
                        continue

                    if similar_id in seen_similar_ids:
                        continue

                    seen_similar_ids.add(similar_id)

                    similar_list.append(
                        {
                            "ID": similar_id,
                            "similarity": entry.get("similarity"),
                        }
                    )

            similarity.append(
                {
                    "ID": sample,
                    "similar": similar_list,
                    "createdAt": datetime.datetime.utcnow().isoformat(),
                }
            )

        except Exception as e:
            print(f"Error processing sample {sample}: {e}")
            similarity.append(
                {
                    "ID": sample,
                    "similar": [],
                    "createdAt": datetime.datetime.utcnow().isoformat(),
                }
            )

    if save_files:
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"{profile}_similarity.json")
        with open(output_path, "w", encoding="utf-8") as outfile:
            json.dump(similarity, outfile, indent=2)

    return similarity
