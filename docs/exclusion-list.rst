Exclusion List
==============

The exclusion list is a persistent, database-backed list of sample IDs and Bonsai group IDs that are skipped on every pipeline run, including scheduled automation runs.  It is the single source of truth for exclusions — no environment variables are required.

There are two types of exclusion:

**Excluded samples**
   Scoped to a specific analysis profile.  A sample is excluded only for the profile under which it was added.

**Excluded groups** (Bonsai only)
   Global — all samples belonging to the listed Bonsai group IDs are skipped regardless of profile.

Managing exclusions in the frontend
-------------------------------------

The **Excluded List** page is available to admin users via the sidebar (the ``pi-ban`` icon).  It has two tabs.

Excluded Samples tab
^^^^^^^^^^^^^^^^^^^^

Enter a sample ID and select its profile, then click **Add**.  If the sample still exists in MIMOSA a dialog appears offering to delete it immediately.  Samples that remain in MIMOSA after being added to the exclusion list are marked with a **Still in MIMOSA** warning tag — they will continue to appear in clustering results until deleted.

To re-enable a sample, click the trash icon on its row.  It will be eligible for re-import on the next pipeline run.

Excluded Groups tab
^^^^^^^^^^^^^^^^^^^

Enter a Bonsai group ID and click **Add**.  All samples in that group will be skipped on every subsequent pipeline run.

.. note::

   Changes take effect on the next pipeline run.  Running automation or the CLI before the next scheduled run will pick up the updated list immediately.

Excluding samples when deleting
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When deleting a sample from the **Samples** page, a checkbox **Also add to excluded list** is shown in the confirmation dialog.  It is pre-checked for samples that originate from Bonsai.  If checked, the sample is added to the exclusion list at the same time it is deleted, preventing it from being re-imported on the next pipeline run.

Managing exclusions from the command line
------------------------------------------

``manage_exclusions.py`` is a standalone helper script for inspecting and editing the exclusion list without running the full pipeline.

.. code-block:: bash

   # List all excluded samples and groups
   python scripts/manage_exclusions.py list

   # Add a sample
   python scripts/manage_exclusions.py add-sample SAMPLE_001 \
     --profile staphylococcus_aureus \
     --added-by analyst@example.com

   # Add a Bonsai group
   python scripts/manage_exclusions.py add-group GROUP_42

   # Remove a sample
   python scripts/manage_exclusions.py remove-sample SAMPLE_001 \
     --profile staphylococcus_aureus

   # Remove a group
   python scripts/manage_exclusions.py remove-group GROUP_42

The script reads ``MONGO_URI`` and ``MONGO_DB_NAME`` from the ``.env`` file at the repository root.

Using ``--exclude-samples`` and ``--exclude-groups``
-----------------------------------------------------

The ``--exclude-samples`` and ``--exclude-groups`` flags let you exclude IDs for a single pipeline run without permanently storing them.

.. code-block:: bash

   python scripts/main.py \
     --credentials credentials.json \
     --exclude-samples SAMPLE_001 SAMPLE_002 \
     --exclude-groups GROUP_42

When running interactively (i.e. not via automation), the pipeline will prompt you to save any new exclusions to the database so they take effect on future runs as well:

.. code-block:: text

   2 sample(s) via --exclude-samples are not yet saved to the DB:
     SAMPLE_001
     SAMPLE_002
   Save to excluded_samples DB for future runs? [y/N]

Answer ``y`` to persist the exclusions; answer ``n`` (or press Enter) to apply them for this run only.  The prompt is skipped entirely in non-interactive (automation) mode.

How automation respects the exclusion list
-------------------------------------------

At startup the pipeline merges the database exclusion list into its runtime sets before fetching any samples.  The automation container does this unconditionally on every scheduled or triggered run.  No additional environment variables are needed — adding an entry via the frontend or ``manage_exclusions.py`` is sufficient for automation to pick it up.

.. seealso::

   :doc:`automation` for scheduling and triggering the automation container.
   :doc:`samples` for deleting samples from the dashboard.

