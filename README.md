# MIMOSA 
 
## Installation and Running the Application


```
git clone https://github.com/genomic-medicine-sweden/MIMOSA

cd MIMOSA

vi config.json #edit API_URL

docker compose up -d
 
```
MIMOSA can then be viewed in the browser at localhost:3000



## Uploading & Deleting Data

``` 
scripts/upload_sample.py ./config.json test_data/test_samples.json #uploads test data to MIMOSA
scripts/upload_similarity.py ./config.json test_data/test_similarity.json #uploads test similarity data to MIMOSA

scripts/delete_sample.py ./config.json test_data/test_samples.json #deletes test data from MIMOSA
scripts/delete_similarity.py ./config.json test_data/test_similarity.json #deletes test similarity data from MIMOSA

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

