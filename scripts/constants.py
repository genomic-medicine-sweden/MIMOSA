AVAILABLE_PROFILES = [
    "staphylococcus_aureus",
    "klebsiella_pneumoniae",
]


REPORTREE_DEFAULTS = {
    "threshold": 9,
    "method": "MSTreeV2",
    "analysis": "grapetree",
}

# Only list profiles that need to deviate from REPORTREE_DEFAULTS.
# Example:
# REPORTREE_PROFILE_PARAMS = {
#     "klebsiella_pneumoniae": {
#         "threshold": 7,
#     },
# }

# QC-status filtering
ALLOWED_QC_STATUSES = {"passed"}


# ---------------------------------------------------------------------------

REQUEST_TIMEOUT = 30

BASE_METADATA_FIELDS = {
    "PostCode",
    "Hospital",
    "Profile",
    "Sequencing_Platform",
    "Pipeline_Version",
    "Pipeline_Date",
    "Date",
    "sample",
    "QC_Status",
    "ST",
    "Time",
    "lims_id",
}

CGMLST_MISSING_CODES = {
    "ASM",
    "EXC",
    "INF",
    "LNF",
    "PLNF",
    "PLOT3",
    "PLOT5",
    "LOTSC",
    "NIPH",
    "NIPHEM",
    "PAMA",
    "ALM",
}


REPORTREE_PROFILE_PARAMS = {}


def get_reportree_params(profile):
    overrides = REPORTREE_PROFILE_PARAMS.get(profile, {})
    return {**REPORTREE_DEFAULTS, **overrides}
