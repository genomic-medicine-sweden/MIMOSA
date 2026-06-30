chewBBACA Import
================

The Import page (admin only) lets you upload chewBBACA ``results_alleles.tsv`` files directly into MIMOSA.
Imported samples are stored in the database and included in the next pipeline run.

1. Navigate to **Import** in the dashboard sidebar.
2. Drag-and-drop one or more ``.tsv`` files onto the upload area, or click to browse.  Folders are supported.
3. Select the **Profile** that matches the organism (e.g. *staphylococcus aureus*).
4. If any sample IDs already exist in the database, a conflict table appears.  Resolve each duplicate:

   - **Skip** — leave the existing record unchanged (default).
   - **Replace** — overwrite the existing allele data.
   - **Rename** — import under a new sample ID.

5. Click **Import N samples** to submit.

Importing via the command line
-------------------------------

chewBBACA files can also be passed directly to the pipeline using the ``--chewbbaca`` flag:

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --chewbbaca /data/results_alleles.tsv \
     --chewbbaca_profile staphylococcus_aureus

See :doc:`pipeline` for the full reference including directory inputs, CSV manifests, and conflict behaviour.
