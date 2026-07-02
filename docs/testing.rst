Testing
=======

The repository includes a small test dataset and helper scripts that let you verify the MIMOSA installation.

Test files
----------

All test files live in the ``test/`` directory:

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - File
     - Description
   * - ``test/MIMOSA_test_results_alleles.tsv``
     - 15 *Staphylococcus aureus* allele profiles in chewBBACA wide format, ready for drag-and-drop or CLI import.
   * - ``test/MIMOSA_test_Metadata.csv``
     - Supplementary metadata (hospital, postcode, collection date) for the same 15 samples.  Used with ``--supplementary_metadata`` in CLI runs.
   * - ``test/MIMOSA_test_Metadata.xlsx``
     - Same metadata in Excel format.  Can be dragged onto the **Samples** page to apply hospital, postcode and date after samples have been imported and clustered.
   * - ``test/test_data.json``
     - Synthetic features, clustering, similarity and distance data.  Used by ``test/test.py`` to test the upload API layer directly without running the pipeline.

Option 1 — UI import (drag-and-drop)
-------------------------------------

This is the quickest way to verify that the frontend, backend and database are all working.

1. Open the **Import** page in the MIMOSA dashboard (admin login required).
2. Drag ``test/MIMOSA_test_results_alleles.tsv`` onto the upload area.
3. Select *staphylococcus_aureus* as the profile and click **Import 15 samples**.
4. The samples appear in the *Pending for next run* table.
5. Click **Run pipeline** to trigger clustering.
6. Navigate to the map or tree view to confirm the samples appear.

**Adding metadata via the Samples page**

After the pipeline has run, drag ``test/MIMOSA_test_Metadata.xlsx`` onto the **Samples** page to apply hospital, postcode and collection date to all 15 test samples.  The map markers will update once the metadata is saved.  See :doc:`samples` for details on the Excel bulk-update format.

To remove the test samples when you are done, delete them from the **Samples** page or use the CLI method below.

Option 2 — Full pipeline via CLI
----------------------------------

``test/mimosa_chewbbaca_test.py`` wraps the pipeline command with the test files pre-configured.  It requires a credentials file for the MIMOSA backend (Bonsai credentials are not needed since ``--bonsai false`` is used).

**Run the pipeline**

.. code-block:: bash

   python test/mimosa_chewbbaca_test.py --credentials credentials.json

This is equivalent to:

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --chewbbaca test/MIMOSA_test_results_alleles.tsv \
     --profile staphylococcus_aureus \
     --bonsai false \
     --supplementary_metadata test/MIMOSA_test_Metadata.csv

**Clean up**

.. code-block:: bash

   python test/mimosa_chewbbaca_test.py --credentials credentials.json --delete

This removes the 15 test samples from ``allele_profiles``, ``features``, and ``clustering`` in MongoDB.

Option 3 — Upload API test (synthetic data)
--------------------------------------------

``test/test.py`` uploads hand-crafted data from ``test/test_data.json`` directly to the API, bypassing the pipeline entirely.  Use this to verify that the upload endpoints and frontend rendering work correctly.

**Upload synthetic test data**

.. code-block:: bash

   python test/test.py --credentials credentials.json

**Delete synthetic test data**

.. code-block:: bash

   python test/test.py --credentials credentials.json --delete

.. note::

   Option 2 and Option 3 test different code paths and are complementary.
   Option 2 exercises the full pipeline (TSV parsing → ReporTree clustering → feature generation → upload).
   Option 3 exercises the upload API and frontend rendering.

Credentials file format
------------------------

All test scripts accept a ``--credentials`` argument pointing to a JSON file with your MIMOSA admin credentials:

.. code-block:: json

   {
     "bonsai_username": "unused_for_chewbbaca_tests",
     "bonsai_password": "unused_for_chewbbaca_tests",
     "mimosa_username": "your_mimosa_admin",
     "mimosa_password": "your_mimosa_password"
   }

``bonsai_username`` and ``bonsai_password`` are not used by the chewBBACA test (``--bonsai false``) but the file format still requires them.  Leave the values as dummy strings if you do not have a Bonsai instance.

