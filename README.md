
<img src="frontend/public/MIMOSA_Full_Logo.svg" alt="MIMOSA Logo">


## Installation and Running the Application
```
git clone https://github.com/genomic-medicine-sweden/MIMOSA

cd MIMOSA

vi config.json #edit API_URL

docker compose up -d
 
```
MIMOSA can then be viewed in the browser at localhost:3000

## Testing
The test suite in `test/` can be used to verify that MIMOSA accepts uploads correctly for features, clustering, and similarity data.
Test data is defined in [`test/test_data.json`](test/test_data.json) and includes three artificial samples: `TEST1`, `TEST2`, and `TEST3`.

```
python test/test.py
```
This uploads the test records to the configured MongoDB collections using `config.json`.

To remove the test samples , add the `--delete` flag

## Uploading data from Bonsai
In order to retrive samples from [Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai) the bonsai_credentials.json
must be edited to include the required authentication details.

```
python scripts/main.py \
    --config <path_to_config.json> \
    --credentials <path_to_bonsai_credentials.json> \
    --supplementary_metadata <path_to_supplementary_metadata.csv> \
    --profile staphylococcus_aureus 
```
 `--update`: Update existing sample metadata.

 `--save_files`: Save intermediate and final output files to the specified `--output` directory.
 
 `--debug`: Show full error tracebacks for debugging.

### supplementary-metadata
Example of supplementary_metadata.csv
```
sample,lims_id,PostCode,Hospital,Date
Sample_143,lims_143,71131,Örebro Universitetssjukhus,2025-03-05
```
To aid with preparing the `--supplementary_metadata` file required by MIMOSA, the prepare_supplementary_metadata.py script generates a template CSV with sample and lims_id for all samples matching a specified profile from Bonsai.
Fields such as PostCode and Hospital are left blank and must be filled in manually before uploading to MIMOSA.

```
python scripts/prepare_supplementary_metadata.py \
    --credentials <path_to_bonsai_credentials.json> \
    --output <path_to_output_directory> \
    --profile staphylococcus_aureus
```

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
