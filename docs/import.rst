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

Demo data
---------

The repository ships with a small test dataset you can use to test MIMOSA:

* ``test/MIMOSA_test_results_alleles.tsv`` — 15 *Staphylococcus aureus* allele profiles ready for drag-and-drop import.
* ``test/MIMOSA_test_Metadata.xlsx`` — matching metadata (hospital, postcode, date) in Excel format, for drag-and-drop onto the **Samples** page.
* ``test/MIMOSA_test_Metadata.csv`` — same metadata in CSV format, used with ``--supplementary_metadata`` in CLI runs.

**UI import (drag-and-drop)**

1. Open the **Import** page and drag ``test/MIMOSA_test_results_alleles.tsv`` onto the upload area.
2. Select *staphylococcus_aureus* as the profile and click **Import 15 samples**.
3. The samples will appear in the *Pending for next run* table; use the **Run pipeline** button to cluster them.
4. After clustering, drag ``test/MIMOSA_test_Metadata.xlsx`` onto the **Samples** page to apply hospital, postcode and date metadata.

**Full pipeline including metadata (CLI)**

.. code-block:: bash

   python test/mimosa_chewbbaca_test.py --credentials credentials.json

This runs ``main.py`` with the test TSV, the supplementary metadata CSV, and ``--bonsai false``.  To clean up afterwards:

.. code-block:: bash

   python test/mimosa_chewbbaca_test.py --credentials credentials.json --delete

Importing via the command line
-------------------------------

chewBBACA files can also be passed directly to the pipeline using the ``--chewbbaca`` flag:

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --chewbbaca /data/results_alleles.tsv \
     --chewbbaca_profile staphylococcus_aureus

See :doc:`pipeline` for the full reference including directory inputs, CSV manifests, and conflict behaviour.
