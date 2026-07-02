AVAILABLE_PROFILES = [
    "staphylococcus_aureus",
    "klebsiella_pneumoniae",
    "escherichia_coli",
]


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
    "source",
    "Latitude",
    "Longitude",
}

CHEWBBACA_FILENAME_SUFFIXES = ("_chewbbaca", "_results_alleles", "_alleles")

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
