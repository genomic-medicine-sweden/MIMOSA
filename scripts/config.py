from pathlib import Path

import yaml

_SETTINGS_FILE = Path(__file__).resolve().parent.parent / "settings.yaml"
_REQUIRED_REPORTREE_KEYS = {"threshold", "method", "analysis"}


def _load_and_validate():
    try:
        with open(_SETTINGS_FILE, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
    except FileNotFoundError:
        raise SystemExit(f"settings.yaml not found at {_SETTINGS_FILE}")
    except yaml.YAMLError as err:
        raise SystemExit(f"settings.yaml is not valid YAML: {err}")

    qc = data.get("allowed_qc_statuses", [])
    if not isinstance(qc, list) or not all(isinstance(s, str) for s in qc):
        raise SystemExit(
            "settings.yaml: allowed_qc_statuses must be a list of strings.\n"
            'Example:  allowed_qc_statuses: ["passed"]  or  allowed_qc_statuses: []'
        )

    defaults = data.get("reportree_defaults", {})
    missing = _REQUIRED_REPORTREE_KEYS - defaults.keys()
    if missing:
        raise SystemExit(
            f"settings.yaml: reportree_defaults is missing required keys: {sorted(missing)}"
        )

    profile_params = data.get("reportree_profile_params") or {}
    if not isinstance(profile_params, dict):
        raise SystemExit("settings.yaml: reportree_profile_params must be a mapping.")

    return qc, defaults, profile_params


_qc, _defaults, _profile_params = _load_and_validate()

ALLOWED_QC_STATUSES = set(_qc)
REPORTREE_DEFAULTS = _defaults
REPORTREE_PROFILE_PARAMS = _profile_params


def get_reportree_params(profile):
    overrides = REPORTREE_PROFILE_PARAMS.get(profile, {})
    return {**REPORTREE_DEFAULTS, **overrides}
