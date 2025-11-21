import json
import os
import requests
from requests.exceptions import ConnectionError
from dotenv import load_dotenv, find_dotenv

dotenv_path = find_dotenv(filename=".env", usecwd=True)
if not dotenv_path:
    raise FileNotFoundError("Could not find project-root .env file.")
load_dotenv(dotenv_path)

def load_credentials(credentials_file):
    """
    Load Bonsai and MIMOSA credentials from a user-specific JSON file.
    Constructs bonsai_api_url from .env values.
    """
    with open(credentials_file, 'r') as file:
        user_credentials = json.load(file)

    domain = os.getenv("DOMAIN")
    bonsai_port = os.getenv("BONSAI_API_PORT")

    if not domain or not bonsai_port:
        raise ValueError("DOMAIN and BONSAI_API_PORT must be set in the .env file.")

    bonsai_api_url = f"http://{domain}:{bonsai_port}"

    return {
        "bonsai_api_url": bonsai_api_url,
        "bonsai_username": user_credentials["bonsai_username"],
        "bonsai_password": user_credentials["bonsai_password"],
        "mimosa_username": user_credentials["mimosa_username"],
        "mimosa_password": user_credentials["mimosa_password"]
    }

def get_access_token(credentials):
    """Retrieve access token from Bonsai API."""
    try:
        response = requests.post(
            f"{credentials['bonsai_api_url']}/token",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "grant_type": "password",
                "username": credentials["bonsai_username"],
                "password": credentials["bonsai_password"]
            }
        )
        response.raise_for_status()
        return response.json().get("access_token")
    except ConnectionError:
        raise RuntimeError(f"Could not connect to Bonsai at {credentials['bonsai_api_url']}. Is the server running?")
    except requests.HTTPError as e:
        raise RuntimeError(f"Failed to get access token: {e.response.text}") from e

def authenticate_mimosa_user(credentials):
    """Authenticate the uploader as a MIMOSA user."""
    domain = os.getenv("DOMAIN")
    backend_port = os.getenv("BACKEND_PORT")
    if not domain or not backend_port:
        raise ValueError("DOMAIN and BACKEND_PORT must be set in the .env file.")

    mimosa_api_url = f"http://{domain}:{backend_port}/api/auth/login"

    try:
        response = requests.post(
            mimosa_api_url,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            json={
                "username": credentials["mimosa_username"],
                "password": credentials["mimosa_password"]
            }
        )
        response.raise_for_status()
        return response.json().get("access_token")
    except ConnectionError:
        raise RuntimeError(f"Could not connect to MIMOSA at {mimosa_api_url}.")
    except requests.HTTPError as e:
        raise RuntimeError(f"Failed to authenticate MIMOSA user: {e.response.text}") from e

def fetch_samples(bonsai_api_url, token):
    """Fetch samples from the Bonsai API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    response = requests.get(f"{bonsai_api_url}/samples/?limit=1000", headers=headers)
    response.raise_for_status()
    return response.json().get("data", [])

def fetch_sample_details(bonsai_api_url, token, sample_id):
    """Fetch details of a specific sample by ID from the Bonsai API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    response = requests.get(f"{bonsai_api_url}/samples/{sample_id}", headers=headers)
    response.raise_for_status()
    return response.json()

