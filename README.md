![MIMOSA Logo](frontend/public/MIMOSA_Full_Logo.svg)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18770176.svg)](https://doi.org/10.5281/zenodo.18770176)

**MIMOSA** is a system for genomic surveillance and outbreak investigation of microbial pathogens, developed within [_Genomic Medicine Sweden_](https://genomicmedicine.se/en/).
It supports the identification, monitoring, and visualisation of genetically related cases across regions by combining whole-genome sequencing data with epidemiological and geographic metadata.

MIMOSA is designed to integrate with [JASEN](https://github.com/genomic-medicine-sweden/jasen) and [Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai).


## Installation and Running the Application
```
git clone https://github.com/genomic-medicine-sweden/MIMOSA

cd MIMOSA

vi .env  # edit DOMAIN and JWT_SECRET at minimum

docker compose up -d

```
> If using the automation service, also update `.env.automation` as described below.

MIMOSA can then be viewed in the browser at localhost:3000

> Note: MIMOSA requires MongoDB to be running as a replica set in order to detect new outbreaks and dispatch notifications.
> The provided `docker-compose.yml` handles this automatically.
> If connecting to an external MongoDB instance, ensure it is configured with `--replSet rs0`.


### Deployment Behind Reverse Proxy / Subpath

MIMOSA can be deployed behind a reverse proxy and/or served from a subpath (e.g. `/mimosa`).

#### Configuration

To enable this, update the following variables in your `.env` file:

```
MIMOSA_RELATIVE_URL_BASE=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_BONSAI_URL=
PUBLIC_ORIGIN=
BONSAI_API_PRIVATE_URL=
MIMOSA_API_PRIVATE_URL_BASE=
```
Leave all values empty for standard local or direct deployments.

- In most cases, you only need to set:
  - `PUBLIC_ORIGIN` (e.g. `https://your-domain`)
  - `MIMOSA_RELATIVE_URL_BASE` (only if using a subpath, e.g. `/mimosa`)
- The remaining variables are optional and intended for advanced setups (e.g. separate internal/external routing).


## Email Notifications

MIMOSA can send outbreak alert emails when clusters exceed configured thresholds.
Notifications are disabled by default and require an SMTP server.

Set the following variables in your `.env` file:
```
NOTIFICATIONS_ENABLED=true
SMTP_HOST=your.smtp.server
SMTP_PORT=smtp.port
SMTP_SECURE=false
SMTP_REJECT_UNAUTHORIZED=false
SMTP_FROM=no-reply@example.com
```

### Outbreak thresholds vs notification thresholds

These are two separate concepts:

- **Outbreak threshold** — the minimum number of cases in a cluster for MIMOSA to *consider it an outbreak at all*. This is a system-wide setting defined, and may be specified per analysis profile in `backend/src/config/outbreak-rules.json`. Clusters below this threshold are never surfaced, regardless of user preferences.

- **Notification threshold** — the minimum number of cases a cluster must have before *a specific user* is notified. This is configured per user in the **Settings** page and can be set equal to or higher than the outbreak threshold, but never lower.


### User preferences

Once notifications are enabled, each user can configure their preferences from the **Settings** page:

- **Outbreak Alerts** — enable or disable email notifications entirely
- **Frequency** — receive alerts immediately, or as a daily (08:00) or weekly (Monday 08:00) digest
- **Alert Threshold** — per-profile minimum case count required to notify that user

To verify that your SMTP configuration is working, send a test email via `GET /api/mail/test`.

## Create user
```
docker compose exec mimosa-backend ./scripts/mimosa create-user \
  --p=<password> \
  --fname=<first-name> \
  --lname=<last-name> \
  --m=<email> \
  --r=<role> \
  --county=<county>
```
Additional users can also be created through the **admin** panel.

## Testing
The test suite in `test/` can be used to confirm that MIMOSA correctly handles uploads.
Test data is defined in [`test/test_data.json`](test/test_data.json) and includes three artificial samples: `TEST1`, `TEST2`, and `TEST3`.

```
python test/test.py --credentials credentials.json
```
This uploads the test records to the configured MongoDB collections using your credentials.

To remove the test samples, add the `--delete` flag.

## Uploading data from Bonsai

MIMOSA can receive sample data from [Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai) either automatically via the automation service, or manually via the command line.


### Automated pipeline

MIMOSA includes an `mimosa-automation` Docker service that checks Bonsai for new samples on a schedule and runs the full pipeline automatically. It is included in `docker-compose.yml` and starts alongside the other services.

Automation-specific configuration is stored in a dedicated `.env.automation` file.

```
# How the automation container reaches the Bonsai API
# Default works when Bonsai is running on the host machine
BONSAI_API_INTERNAL=http://host.docker.internal

# Automation service credentials
AUTOMATION_BONSAI_USERNAME=bonsai_username
AUTOMATION_BONSAI_PASSWORD=bonsai_password
AUTOMATION_MIMOSA_USERNAME=mimosa_username
AUTOMATION_MIMOSA_PASSWORD=mimosa_password

# Profiles to process (comma-separated)
AUTOMATION_PROFILES=staphylococcus_aureus,klebsiella_pneumoniae

# Hours to wait between checks (counted from end of previous run)
AUTOMATION_SCHEDULE_HOURS=1

# Set to true to run once immediately on container start
AUTOMATION_RUN_ON_STARTUP=false
```

> The automation service requires valid Bonsai and MIMOSA credentials in `.env.automation` to process samples.
> It is recommended to use a dedicated service account for the automation rather than a personal user account.
> This ensures consistent access and provides better traceability of automated actions.

To disable the automation service without removing it, set `AUTOMATION_RUN_ON_STARTUP=false` and comment out or remove the `mimosa-automation` service from `docker-compose.yml`.

---

#### Permission issues

The automation service runs as a non-root user inside the container.
If the output directory is not writable, the pipeline may fail or produce no output.

The directory `./volumes/automation_tmp` is used to store pipeline output and is mounted from the host into the container. Host permissions therefore apply and may prevent the automation user from writing to it.

To fix this, set ownership to match the container user (UID 1000):

```bash
sudo chown -R 1000:1000 volumes/automation_tmp
```

After fixing permissions, restart the automation service:

```bash
docker compose restart mimosa-automation
```


### Manual upload

To manually retrieve and upload samples from Bonsai, provide valid authentication details in a credentials file (`credentials.json`):

```json
{
    "bonsai_username": "your_username",
    "bonsai_password": "your_password",
    "mimosa_username": "your_mimosa_email",
    "mimosa_password": "your_mimosa_password"
}
```

Then run:

```
python scripts/main.py \
    --credentials credentials.json \
    --supplementary_metadata <path_to_supplementary_metadata.csv> \
    --profile staphylococcus_aureus
```

Optional flags:
* `--update`: Update existing sample metadata.
* `--save_files`: Save intermediate and final output files to the specified `--output` directory.
* `--debug`: Show full error tracebacks for debugging.
* `--skip_similarity`: Skip similarity computation via Bonsai and related uploads.
* `--groups <group_id> [<group_id> ...]`: Only process samples belonging to the specified Bonsai group(s).

### Supplementary metadata

Example of `supplementary_metadata.csv`:

```
sample,lims_id,PostCode,Hospital,Date
Sample_143,lims_143,71131,Örebro Universitetssjukhus,2025-03-05
```

To aid in preparing the `--supplementary_metadata` file, the `prepare_supplementary_metadata.py` script generates a template CSV with `sample` and `lims_id` for all samples matching a specified profile from Bonsai. Fields such as `PostCode` and `Hospital` are left blank and must be filled in manually.

```
python scripts/prepare_supplementary_metadata.py \
    --credentials credentials.json \
    --output <path_to_output_directory> \
    --profile staphylococcus_aureus
```

Alternatively, supplementary metadata (e.g. `PostCode`, `Hospital`, `Date`) can also be added by admin users via the **Samples** page, either through inline editing or by uploading an Excel (`.xlsx`) file for bulk updates.

From the **Samples** page, a pre-formatted Excel template for bulk correction can be downloaded with three export options:
- **Missing location** – Samples lacking both `Hospital` and `PostCode` (required for map visualisation)
- **Incomplete samples** – Samples missing one or more required metadata fields
- **All samples**

The downloaded file can be edited and re-uploaded via the existing Excel bulk update functionality.

### conda environment

```
conda create -n mimosa python=3.11

conda activate mimosa

pip install -r scripts/requirements.txt
```

## Citation
If you use MIMOSA, please cite the Zenodo record for the version used. The DOI https://doi.org/10.5281/zenodo.18770176 always resolves to the latest release.

##### Links

[Sweden Boundaries](https://cartographyvectors.com/map/1521-sweden-with-regions)

[Postcodes](https://www.geonames.org/)

[ReporTree](https://github.com/insapathogenomics/ReporTree)

[Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai)
