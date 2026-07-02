![MIMOSA Logo](frontend/public/MIMOSA_Full_Logo.svg)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18770176.svg)](https://doi.org/10.5281/zenodo.18770176)

**MIMOSA** is a system for genomic surveillance and outbreak investigation of microbial pathogens, developed within [_Genomic Medicine Sweden_](https://genomicmedicine.se/en/).
It supports the identification, monitoring, and visualisation of genetically related cases across regions by combining whole-genome sequencing data with epidemiological and geographic metadata.

MIMOSA is designed to integrate with [Bonsai](https://github.com/SMD-Bioinformatics-Lund/bonsai), which is intended to be used in combination with [JASEN](https://github.com/genomic-medicine-sweden/jasen). 
Bonsai serves as the primary source of allele profiles and sample metadata for MIMOSA. MIMOSA can also ingest chewBBACA TSV files directly.

MIMOSA has been tested with Bonsai v2.1.0. Other Bonsai versions may also work.

See the [full documentation](https://mimosa.readthedocs.io/en/latest/) for setup, configuration, and usage.

## Installation and Running the Application
```
git clone https://github.com/genomic-medicine-sweden/MIMOSA

cd MIMOSA

vi .env  # edit DOMAIN and JWT_SECRET at minimum

docker compose up -d

```


## Citation
If you use MIMOSA, please cite the Zenodo record for the version used. The DOI https://doi.org/10.5281/zenodo.18770176 always resolves to the latest release.


