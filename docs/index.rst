Overview
========

**MIMOSA** is a system for genomic surveillance and outbreak investigation of microbial pathogens, developed within `Genomic Medicine Sweden <https://genomicmedicine.se/en/>`_.
It supports the identification, monitoring, and visualisation of genetically related cases across regions by combining whole-genome sequencing data with epidemiological and geographic metadata.

MIMOSA is designed to integrate with `Bonsai <https://github.com/SMD-Bioinformatics-Lund/bonsai>`_, which is intended to be used in combination with `JASEN <https://github.com/genomic-medicine-sweden/jasen>`_.
Bonsai serves as the primary source of allele profiles and sample metadata for MIMOSA. MIMOSA can also ingest chewBBACA TSV files directly.

MIMOSA has been tested with Bonsai v2.1.0. Other Bonsai versions may also work.



.. toctree::
   :hidden:
   :caption: MIMOSA 
   :maxdepth: 2

   deployment
   configuration
   automation
   pipeline
   import
   testing
   user-management
   notifications

.. toctree::
   :hidden:
   :caption: Using MIMOSA
   :maxdepth: 2

   samples
   pending-samples
   exclusion-list
   notification-preferences

.. toctree::
   :hidden:
   :caption: Citations
   :maxdepth: 2

   citations

