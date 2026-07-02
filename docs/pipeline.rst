Pipeline
========

The MIMOSA pipeline fetches sample data, runs allele-based clustering with `ReporTree <https://github.com/insapathogenomics/ReporTree>`_, and uploads the results to the database so the frontend can display them.

Data sources
------------

The pipeline supports two data sources that can be used independently or together.

**Bonsai** (default)
   Samples and their cgMLST allele profiles are fetched from a Bonsai LIMS instance.  Authentication uses a credentials file or environment variables (see `Credentials`_ below).

**chewBBACA import**
   Allele profiles imported directly into MIMOSA via the web UI (see :doc:`import`) or by passing TSV files on the command line with ``--chewbbaca``.  When Bonsai is disabled (``--bonsai false``) the pipeline clusters only from locally imported data.

When both sources are active, Bonsai data and locally imported chewBBACA profiles are merged before clustering.  If any Bonsai-sourced features already exist in the database, Bonsai is always included regardless of settings to avoid incomplete clustering.

Credentials
-----------

When running the pipeline manually you must supply credentials for both Bonsai and the MIMOSA backend.  Provide them as a JSON file passed with ``--credentials``:

.. code-block:: json

   {
     "bonsai_username": "your_bonsai_user",
     "bonsai_password": "your_bonsai_password",
     "mimosa_username": "your_mimosa_user",
     "mimosa_password": "your_mimosa_password"
   }

Alternatively, when running inside Docker or in CI the pipeline reads credentials from environment variables (see :doc:`automation`).

chewBBACA input formats
-----------------------

The ``--chewbbaca`` option accepts three input types:

**Single TSV file**

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --chewbbaca /data/results_alleles.tsv \
     --chewbbaca_profile staphylococcus_aureus

**Directory** — all ``.tsv`` files in the directory are loaded:

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --chewbbaca /data/chewbbaca_results/ \
     --chewbbaca_profile staphylococcus_aureus

**CSV manifest** — a file listing paths and optional per-row profile and sample ID overrides:

.. code-block:: text

   ID,file_path,profile
   MRSA_SAMPLE_001,/data/run1/results_alleles.tsv,staphylococcus_aureus
   KPN_SAMPLE_001,/data/run2/results_alleles.tsv,klebsiella_pneumoniae

Accepted column names: ``ID`` or ``sample_id`` (optional — overrides the sample name in the TSV for single-sample files); ``file_path``, ``path``, or ``file`` (required); ``profile`` or ``analysis_profile`` (optional — overrides ``--chewbbaca_profile`` for that row).

``--chewbbaca`` can be repeated to supply multiple inputs:

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --chewbbaca /data/staph.tsv   --chewbbaca_profile staphylococcus_aureus \
     --chewbbaca /data/kpn.tsv     --chewbbaca_profile klebsiella_pneumoniae

Conflict and priority behaviour
--------------------------------

When running in mixed mode (Bonsai + chewBBACA), two types of conflict can occur.

Bonsai conflicts
^^^^^^^^^^^^^^^^

A local sample ID matches a sample already present in Bonsai.  Set ``CHEWBBACA_CONFLICT`` to control the outcome:

.. code-block:: bash

   CHEWBBACA_CONFLICT=use_bonsai    # keep the sample using Bonsai alleles (default)
   CHEWBBACA_CONFLICT=use_chewbbaca # use the locally imported allele profile instead
   CHEWBBACA_CONFLICT=skip          # exclude the conflicting sample from this run

In interactive mode (running the script directly, not via automation), you are prompted for each conflicting sample if this variable is not set.

The conflict check strips common local filename suffixes — for example a local file named ``SAMPLE_001_chewbbaca.tsv`` is compared against the Bonsai sample ID ``SAMPLE_001``.

Local store duplicates
^^^^^^^^^^^^^^^^^^^^^^

When importing a chewBBACA sample that already exists in the local MongoDB store, ``CHEWBBACA_DUPLICATE_ACTION`` controls the behaviour:

.. code-block:: bash

   CHEWBBACA_DUPLICATE_ACTION=skip     # keep the existing record (default)
   CHEWBBACA_DUPLICATE_ACTION=replace  # overwrite and record replacement history

These variables can be set in ``.env`` or passed as environment variables before running the pipeline.

Supplementary metadata
-----------------------

Supplementary metadata (postcode, hospital, date, LIMS ID, etc.) can be attached to samples at pipeline time via a CSV file:

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --supplementary_metadata supplementary_metadata.csv \
     --profile staphylococcus_aureus

The CSV must contain a ``sample`` column (matching the sample ID from Bonsai or the TSV) and one or more metadata columns:

.. code-block:: text

   sample,lims_id,PostCode,Hospital,Date,Latitude,Longitude
   SAMPLE_001,lims_001,71131,Örebro Universitetssjukhus,2025-03-05,,
   SAMPLE_002,lims_002,,,,52.2053,0.1218

Supported metadata columns: ``PostCode``, ``Hospital``, ``Date``, ``Latitude``, ``Longitude``.  All are optional — include only the columns you have data for.  If ``Latitude`` is provided, ``Longitude`` must also be provided (and vice versa); samples with only one coordinate are skipped with a warning.  Samples with valid coordinates are plotted on the map even when no postcode or hospital is available.

To prepare the file, generate a template with sample IDs pre-populated from Bonsai:

.. code-block:: bash

   python scripts/prepare_supplementary_metadata.py \
     --credentials credentials.json \
     --output ./metadata_templates/ \
     --profile staphylococcus_aureus

The template contains ``sample`` and ``lims_id`` columns filled in from Bonsai, plus empty columns for ``PostCode``, ``Hospital``, ``Date``, ``Latitude``, and ``Longitude``.  Fill in the relevant fields manually before passing the file to the pipeline.

Supplementary metadata can also be added or corrected after import via the **Samples** page in the dashboard (see :doc:`/pending-samples` for pre-registering metadata before samples arrive).

Command-line reference
----------------------

All commands are run from the repository root.

.. list-table::
   :header-rows: 1
   :widths: 35 60

   * - Option
     - Description
   * - ``--credentials PATH``
     - Path to a JSON file containing ``bonsai_username``, ``bonsai_password``, ``mimosa_username``, ``mimosa_password``.  Required when not using environment-variable credentials.
   * - ``--supplementary_metadata PATH``
     - Path to a CSV file with additional metadata (``PostCode``, ``Hospital``, ``Date``, etc.) keyed on sample ID.  See `Supplementary metadata`_ above.
   * - ``--profile PROFILE [...]``
     - One or more profiles to process.  Defaults to all profiles.  Pass ``all`` to process every profile explicitly.
   * - ``--groups GROUP [...]``
     - Restrict processing to specific Bonsai groups.
   * - ``--bonsai true|false``
     - Whether to fetch from Bonsai.  Default: ``true``.
   * - ``--chewbbaca PATH``
     - Path to a chewBBACA TSV file, directory, or CSV manifest.  Repeatable.
   * - ``--chewbbaca_profile PROFILE``
     - Analysis profile for the corresponding ``--chewbbaca`` input.  Repeatable.
   * - ``--update-only``
     - Sync metadata only — skip clustering.
   * - ``--re-cluster``
     - Force clustering even when no new samples are detected.
   * - ``--run-similarity``
     - Run similarity analysis after clustering.
   * - ``--exclude-samples ID [...]``
     - Sample IDs to exclude for this run.  A single value may be a file path with one ID per line.  In interactive mode you will be offered the option to persist new exclusions to the database.  See :doc:`exclusion-list`.
   * - ``--exclude-groups ID [...]``
     - Group IDs to exclude for this run (file path also accepted).  Same persistence prompt as ``--exclude-samples``.
   * - ``--output DIR``
     - Directory to save intermediate files.  Requires ``--save_files``.
   * - ``--save_files``
     - Save intermediate files to ``--output``.
   * - ``--debug``
     - Enable verbose debug logging.
   * - ``--email [ADDRESS]``
     - Send a failure-alert email.  Without an address, sends to the authenticated user.

Examples
^^^^^^^^

Process all profiles using Bonsai:

.. code-block:: bash

   python scripts/main.py --credentials credentials.json --profile All

Process a single profile without Bonsai (chewBBACA-only):

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --profile staphylococcus_aureus \
     --bonsai false

Import a local TSV and cluster alongside Bonsai:

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --chewbbaca /data/results_alleles.tsv \
     --chewbbaca_profile staphylococcus_aureus

Force re-clustering for all profiles:

.. code-block:: bash

   python scripts/main.py --credentials credentials.json --re-cluster

