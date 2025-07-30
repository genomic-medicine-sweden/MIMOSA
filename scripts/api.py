import json
import requests
from requests.exceptions import ConnectionError

def load_credentials(credentials_file):
    """Load API credentials from a JSON file."""
    with open(credentials_file, 'r') as file:
        credentials = json.load(file)
        return {
            "api_url": credentials["bonsai_api_url"],
            "username": credentials["bonsai_username"],
            "password": credentials["bonsai_password"]
        }

def get_access_token(credentials):
    """Retrieve the access token using the API credentials."""
    try:
        response = requests.post(
            f"{credentials['api_url']}/token",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "grant_type": "password",
                "username": credentials["username"],
                "password": credentials["password"]
            }
        )
        response.raise_for_status()
        return response.json().get("access_token")
    except ConnectionError:
        raise RuntimeError(f"Could not connect to Bonsai at {credentials['api_url']}. Is the server running?")
    except requests.HTTPError as e:
        raise RuntimeError(f"Failed to get access token: {e.response.text}") from e

def fetch_samples(api_url, token):
    """Fetch samples from the API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    response = requests.get(f"{api_url}/samples/?limit=1000", headers=headers)
    response.raise_for_status()
    return response.json().get("data", [])

def fetch_sample_details(api_url, token, sample_id):
    """Fetch details of a specific sample by ID."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    response = requests.get(f"{api_url}/samples/{sample_id}", headers=headers)
    response.raise_for_status()
    return response.json()

