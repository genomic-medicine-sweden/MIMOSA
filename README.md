# MIMOSA 
 
## Installation and Running the Application


```
git clone https://github.com/genomic-medicine-sweden/MIMOSA

cd MIMOSA

vi config.json #edit API_URL

docker compose up -d
 
```
MIMOSA can then be viewed in the browser at localhost:3000



## Uploading data from BONSAI
In order to retrive samples from [BONSAI](https://github.com/SMD-Bioinformatics-Lund/bonsai) the bonsai_credentials.json
must be edited to include the required authentication details.

``` 
python scripts/main.py \
    --config <path_to_config.json> \
    --credentials <path_to_bonsai_credentials.json> \
    --output <path_to_output_directory> \
    --supplementary_metadata <path_to_supplementary_metadata.csv> \
    --profile staphylococcus_aureus
```

### supplementary-metadata
Example of supplementary_metadata.csv
```
sample,lims_id,PostCode,Hospital,Date
Sample_143,lims_143,71131,Örebro Universitetssjukhus,2025-03-05
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

[BONSAI](https://github.com/SMD-Bioinformatics-Lund/bonsai)
