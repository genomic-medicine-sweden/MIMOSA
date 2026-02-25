
![MIMOSA Logo](frontend/public/MIMOSA_Full_Logo.svg)

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

##### Links

[Sweden Boundaries](https://cartographyvectors.com/map/1521-sweden-with-regions)

[Postcodes](https://www.geonames.org/)

[ReporTree](https://github.com/insapathogenomics/ReporTree)

[Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai)

