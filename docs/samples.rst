Samples
=======

The **Samples** page shows all samples currently stored in MIMOSA.
Navigate to **Samples** in the sidebar to view, search, and edit sample metadata.

.. note::

   You need a user account to access the dashboard.  See :doc:`user-management` for how accounts are created and :doc:`notification-preferences` for configuring email alerts.

For a sample to appear on the map it needs at least a postcode, hospital, or coordinates.

Editing metadata
----------------

- **Inline** — click any field in the table to edit it directly and save immediately.
- **Bulk Excel update** — click **Export** to download a pre-filled template (choose *Missing location*, *Incomplete samples*, or *All samples*), fill in the gaps, then drag-and-drop the file back onto the page to apply.

To register metadata before a sample arrives, use :doc:`pending-samples`.

Deleting samples
----------------

Click the trash icon on a sample row to delete it.  A confirmation dialog appears with a checkbox **Also add to excluded list** (pre-checked for Bonsai samples).  If checked, the sample is added to the :doc:`exclusion-list` at the same time so it is not re-imported on the next pipeline run.

.. _why-metadata-matters:

Why metadata matters
--------------------

For a sample to appear as a marker on the map and be counted in outbreak detection, it needs at least one of:

- **PostCode** — resolved to coordinates via the postcode lookup table
- **Hospital** — resolved to coordinates via the hospital coordinates table
- **Manual coordinates** — explicit latitude/longitude

Samples without any of these are clustered normally but will not appear on the map.
