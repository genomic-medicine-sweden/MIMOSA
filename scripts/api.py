import json
import logging
import os
import time
import requests
from requests.exceptions import ConnectionError
from dotenv import load_dotenv
from pathlib import Path
from constants import REQUEST_TIMEOUT

log = logging.getLogger(__name__)

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


def normalise_scalar(value, default="Unknown"):
    """
    Normalise API fields that may be returned as either a scalar or list.
    If a list is provided, the first element is used.
    """
    if isinstance(value, list):
        return value[0] if value else default
    return value


def auth_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


def load_credentials(credentials_file=None):
    """
    Load Bonsai and MIMOSA credentials.
    """

    domain = os.getenv("DOMAIN")
    bonsai_port = os.getenv("BONSAI_API_PORT")

    if not domain or not bonsai_port:
        raise ValueError("DOMAIN and BONSAI_API_PORT must be set in the .env file.")

    bonsai_api_internal = os.getenv("BONSAI_API_INTERNAL")
    bonsai_api_private = os.getenv("BONSAI_API_PRIVATE_URL")

    if bonsai_api_internal:
        bonsai_api_url = f"{bonsai_api_internal}:{bonsai_port}"
    elif bonsai_api_private:
        bonsai_api_url = bonsai_api_private
    else:
        bonsai_api_url = f"http://{domain}:{bonsai_port}"

    if credentials_file:
        with open(credentials_file, "r") as file:
            user_credentials = json.load(file)

        return {
            "bonsai_api_url": bonsai_api_url,
            "bonsai_username": user_credentials["bonsai_username"],
            "bonsai_password": user_credentials["bonsai_password"],
            "mimosa_username": user_credentials["mimosa_username"],
            "mimosa_password": user_credentials["mimosa_password"],
        }

    bonsai_username = os.getenv("AUTOMATION_BONSAI_USERNAME")
    bonsai_password = os.getenv("AUTOMATION_BONSAI_PASSWORD")
    mimosa_username = os.getenv("AUTOMATION_MIMOSA_USERNAME")
    mimosa_password = os.getenv("AUTOMATION_MIMOSA_PASSWORD")

    missing = [
        name
        for name, val in {
            "AUTOMATION_BONSAI_USERNAME": bonsai_username,
            "AUTOMATION_BONSAI_PASSWORD": bonsai_password,
            "AUTOMATION_MIMOSA_USERNAME": mimosa_username,
            "AUTOMATION_MIMOSA_PASSWORD": mimosa_password,
        }.items()
        if not val
    ]

    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing)}"
        )

    return {
        "bonsai_api_url": bonsai_api_url,
        "bonsai_username": bonsai_username,
        "bonsai_password": bonsai_password,
        "mimosa_username": mimosa_username,
        "mimosa_password": mimosa_password,
    }


def get_access_token(credentials):
    """
    Retrieve access token from the Bonsai API.
    """
    try:
        response = requests.post(
            f"{credentials['bonsai_api_url']}/token",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "password",
                "username": credentials["bonsai_username"],
                "password": credentials["bonsai_password"],
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        return response.json().get("access_token")

    except ConnectionError:
        raise RuntimeError(
            f"Could not connect to Bonsai at {credentials['bonsai_api_url']}. "
            "Is the server running?"
        )

    except requests.HTTPError as e:
        raise RuntimeError(f"Failed to get access token: {e.response.text}") from e


def authenticate_mimosa_user(credentials):
    """
    Authenticate the uploader as a MIMOSA user.
    """

    domain = os.getenv("DOMAIN")
    backend_port = os.getenv("BACKEND_PORT")

    if not domain or not backend_port:
        raise ValueError("DOMAIN and BACKEND_PORT must be set in the .env file.")

    mimosa_api_base = (
        os.getenv("MIMOSA_API_INTERNAL")
        or os.getenv("MIMOSA_API_PRIVATE_URL_BASE")
        or f"http://{domain}:{backend_port}"
    )

    mimosa_api_url = f"{mimosa_api_base}/api/auth/login"

    try:
        response = requests.post(
            mimosa_api_url,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            json={
                "username": credentials["mimosa_username"],
                "password": credentials["mimosa_password"],
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        return response.json().get("access_token")

    except ConnectionError:
        raise RuntimeError(f"Could not connect to MIMOSA at {mimosa_api_url}.")

    except requests.HTTPError as e:
        raise RuntimeError(
            f"Failed to authenticate MIMOSA user: {e.response.text}"
        ) from e


def fetch_samples(bonsai_api_url, token):
    """
    Fetch all samples from the Bonsai API and normalise profile fields.
    Retries up to 3 times on transient failures.
    """
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            count_response = requests.get(
                f"{bonsai_api_url}/samples/?limit=1",
                headers=auth_headers(token),
                timeout=REQUEST_TIMEOUT,
            )
            count_response.raise_for_status()

            payload = count_response.json()
            total = payload.get("records_total", 0)

            if total == 0:
                return []

            response = requests.get(
                f"{bonsai_api_url}/samples/?limit={total}",
                headers=auth_headers(token),
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()

            samples = response.json().get("data", [])

            for sample in samples:
                sample["profile"] = normalise_scalar(sample.get("profile"))

            return samples

        except requests.exceptions.HTTPError as e:
            if attempt < max_retries - 1:
                log.warning(
                    "Bonsai API error (attempt %d/%d): %s %s. Retrying in %ds...",
                    attempt + 1,
                    max_retries,
                    e.response.status_code,
                    e.response.reason,
                    retry_delay,
                )
                time.sleep(retry_delay)
            else:
                raise RuntimeError(
                    f"Failed to fetch samples after {max_retries} attempts: {e}"
                ) from e

        except (ConnectionError, requests.exceptions.RequestException) as e:
            if attempt < max_retries - 1:
                log.warning(
                    "Connection error (attempt %d/%d): %s. Retrying in %ds...",
                    attempt + 1,
                    max_retries,
                    e,
                    retry_delay,
                )
                time.sleep(retry_delay)
            else:
                raise RuntimeError(
                    f"Failed to fetch samples after {max_retries} attempts: {e}"
                ) from e


def fetch_sample_details(bonsai_api_url, token, sample_id):
    """
    Fetch details of a specific sample by ID from the Bonsai API.
    """

    response = requests.get(
        f"{bonsai_api_url}/samples/{sample_id}",
        headers=auth_headers(token),
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()

    data = response.json()

    pipeline = data.get("pipeline")
    if pipeline:
        pipeline["analysis_profile"] = normalise_scalar(
            pipeline.get("analysis_profile")
        )

    return data


def validate_groups(bonsai_api_url, token, group_ids):
    """
    Validate that all provided group IDs exist in Bonsai.
    """
    invalid = []

    for group_id in group_ids:
        try:
            fetch_group(bonsai_api_url, token, group_id)
        except ValueError:
            invalid.append(group_id)

    if invalid:
        listed = ", ".join(f"'{g}'" for g in invalid)
        raise ValueError(
            f"The following group ID(s) were not found in Bonsai: {listed}"
        )


def _mimosa_api_base():
    domain = os.getenv("DOMAIN")
    backend_port = os.getenv("BACKEND_PORT")
    return (
        os.getenv("MIMOSA_API_INTERNAL")
        or os.getenv("MIMOSA_API_PRIVATE_URL_BASE")
        or f"http://{domain}:{backend_port}"
    )


def get_current_user(upload_token):
    """Fetch the authenticated user's profile from MIMOSA."""
    response = requests.get(
        f"{_mimosa_api_base()}/api/users/me",
        headers=auth_headers(upload_token),
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def send_pipeline_alert(upload_token, errors, profiles, recipient=None):
    """Send a pipeline failure alert via the MIMOSA API."""
    payload = {
        "errors": errors,
        "profiles": profiles,
    }
    if recipient:
        payload["recipient"] = recipient
    response = requests.post(
        f"{_mimosa_api_base()}/api/mail/pipeline-alert",
        headers={**auth_headers(upload_token), "Content-Type": "application/json"},
        json=payload,
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def fetch_group(bonsai_api_url, token, group_id):
    """
    Fetch a specific group by ID and return its included sample IDs.
    """

    response = requests.get(
        f"{bonsai_api_url}/groups/{group_id}?lookup_samples=false",
        headers=auth_headers(token),
        timeout=REQUEST_TIMEOUT,
    )

    if response.status_code in (404, 500):
        raise ValueError(f"Group '{group_id}' was not found in Bonsai.")

    response.raise_for_status()
    return response.json().get("included_samples", [])
