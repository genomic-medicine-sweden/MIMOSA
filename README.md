
![MIMOSA Logo](frontend/public/MIMOSA_Full_Logo.svg)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18770176.svg)](https://doi.org/10.5281/zenodo.18770176)

**MIMOSA** is a system for genomic surveillance and outbreak investigation of microbial pathogens, developed within [_Genomic Medicine Sweden_](https://genomicmedicine.se/en/).  
It supports the identification, monitoring, and visualisation of genetically related cases across regions by combining whole-genome sequencing data with epidemiological and geographic metadata.

MIMOSA is designed to integrate with [JASEN](https://github.com/genomic-medicine-sweden/jasen) and [Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai).


## Installation and Running the Application
```
git clone https://github.com/genomic-medicine-sweden/MIMOSA

cd MIMOSA

vi .env #edit Domain and JWT_SECRET

docker compose up -d

```

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
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REJECT_UNAUTHORIZED=false
SMTP_FROM=no-reply@example.com
```

### Outbreak thresholds vs notification thresholds

These are two separate concepts:

- **Outbreak threshold** — the minimum number of cases in a cluster for MIMOSA to *consider it an outbreak at all*. This is a system-wide setting defined, and may be specified per analysis profile in `backend/src/config/outbreak-rules.json`. Clusters below this threshold are never surfaced, regardless of user preferences.

- **Notification threshold** — the minimum number of cases a cluster must have before *a specific user* is notified. This is configured per user in the **Settings** page and can be set equal to or higher than the outbreak threshold, but never lower.

In practice: if the outbreak threshold for a profile is 5, a cluster of 3 will never trigger any notifications. If a user sets their notification threshold to 8, they will only be notified once a cluster reaches 8 cases.

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
To retrieve samples from [Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai), you must provide valid authentication details in your credentials file (`credentials.json`).
```
python scripts/main.py \
    --credentials <credentials.json> \
    --supplementary_metadata <path_to_supplementary_metadata.csv> \
    --profile staphylococcus_aureus
```

Optional flags: 
* `--update`: Update existing sample metadata.
* `--save_files`: Save intermediate and final output files to the specified `--output` directory.
* `--debug`: Show full error tracebacks for debugging.
* `--skip_similarity`: Skip similarity computation via Bonsai and related uploads.

### supplementary-metadata
Example of `supplementary_metadata.csv`:

```
sample,lims_id,PostCode,Hospital,Date
Sample_143,lims_143,71131,Örebro Universitetssjukhus,2025-03-05
```

To aid in preparing the `--supplementary_metadata` file required by MIMOSA, the `prepare_supplementary_metadata.py` script generates a template CSV with `sample` and `lims_id` for all samples matching a specified profile from Bonsai.
Fields such as `PostCode` and `Hospital` are left blank and must be filled in manually before uploading to MIMOSA.

```
python scripts/prepare_supplementary_metadata.py \
    --credentials <credentials.json> \
    --output <path_to_output_directory> \
    --profile staphylococcus_aureus
```

Alternatively, supplementary metadata (e.g. `PostCode`, `Hospital`, `Date`) can also be added by admin users via the **Samples** page, either through inline editing or by uploading an Excel (`.xlsx`) file for bulk updates.

From the **Samples** page, a pre-formatted Excel template for bulk correction can be downloaded with three export options:
- **Missing location** – Samples lacking both `Hospital` and `PostCode` (required for map visualisation)
- **Incomplete samples** – Samples missing one or more required metadata fields
- **All samples**

The downloaded file can be edited and re-uploaded via the existing Excel bulk update functionality.

#### conda environment

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

