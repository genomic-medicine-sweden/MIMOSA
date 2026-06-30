Automation
==========

The ``mimosa-automation`` container runs the pipeline on a configurable schedule and exposes an HTTP endpoint so the pipeline can be triggered immediately via the API.

Configuration (``.env.automation``)
-------------------------------------

.. list-table::
   :header-rows: 1
   :widths: 40 50

   * - Variable
     - Description
   * - ``AUTOMATION_BONSAI_ENABLED``
     - ``true`` (default) to fetch from Bonsai, ``false`` for chewBBACA-only mode.  If Bonsai-sourced features already exist in the database, Bonsai is always used regardless of this flag.
   * - ``BONSAI_API_INTERNAL``
     - Internal URL of the Bonsai API reachable from inside Docker (e.g. ``http://host.docker.internal``).
   * - ``AUTOMATION_BONSAI_USERNAME``
     - Service-account username for Bonsai.
   * - ``AUTOMATION_BONSAI_PASSWORD``
     - Service-account password for Bonsai.
   * - ``AUTOMATION_MIMOSA_USERNAME``
     - Service-account username for the MIMOSA backend.
   * - ``AUTOMATION_MIMOSA_PASSWORD``
     - Service-account password for the MIMOSA backend.
   * - ``AUTOMATION_PROFILES``
     - Comma-separated list of profiles to process.  Leave empty to process all profiles.
   * - ``AUTOMATION_GROUPS``
     - Comma-separated Bonsai group IDs to restrict processing.  Leave empty for all groups.
   * - ``AUTOMATION_UPDATE_ONLY``
     - ``true`` to sync metadata only (no clustering).  Mutually exclusive with ``AUTOMATION_RE_CLUSTER``.
   * - ``AUTOMATION_RE_CLUSTER``
     - ``true`` to force clustering on every run even when no new samples are detected.
   * - ``AUTOMATION_RUN_SIMILARITY``
     - ``true`` to run similarity analysis after every clustering step.
   * - ``AUTOMATION_SCHEDULE_HOURS``
     - How often the pipeline runs, in hours.  Decimals are accepted (e.g. ``0.5`` = every 30 minutes).
   * - ``AUTOMATION_RUN_ON_STARTUP``
     - ``true`` to run the pipeline immediately when the container starts in addition to the scheduled interval.
   * - ``AUTOMATION_TRIGGER_PORT``
     - Port the trigger HTTP server listens on inside the container.  Default: ``8081``.
   * - ``CHEWBBACA_WATCH_CONFIG``
     - Path inside the container to the watch config JSON file.  Leave unset to disable directory watching.
   * - ``CHEWBBACA_WATCH_INTERVAL``
     - How often to scan watched directories, in hours.  Decimals are accepted (e.g. ``0.5`` = every 30 minutes).  Default: ``24``.

Scheduled runs
--------------

The automation container sleeps for ``AUTOMATION_SCHEDULE_HOURS`` hours, then calls ``check_and_run()``.  This loop runs indefinitely.  Set ``AUTOMATION_RUN_ON_STARTUP=true`` to also run once immediately on container start (after the backend is ready).

If a scheduled run is already in progress when the next interval fires, the new run is skipped and logged as ``event=trigger_skipped reason=already_running``.

Watch directory
---------------

When ``CHEWBBACA_WATCH_CONFIG`` is set, the container monitors one or more directories for new chewBBACA TSV files and runs the pipeline automatically when new files appear.

A ``watch-dirs.json`` file is included in the ``automation/`` directory, pre-configured for the default profiles.  Each profile maps to one or more paths **inside the container**:

.. code-block:: json

   {
     "staphylococcus_aureus": ["/watch/staphylococcus_aureus"],
     "klebsiella_pneumoniae": ["/watch/klebsiella_pneumoniae"],
     "escherichia_coli":      ["/watch/escherichia_coli"]
   }

If data for a species is spread across multiple locations on the server, add extra entries for that profile:

.. code-block:: json

   {
     "staphylococcus_aureus": [
       "/watch/staphylococcus_aureus",
       "/watch/staphylococcus_aureus_2"
     ]
   }

For each path listed in ``watch-dirs.json``, add a matching volume mount to the ``mimosa-automation`` service in ``docker-compose.yml``:

.. code-block:: yaml

   volumes:
     - ./automation/watch-dirs.json:/watch-dirs.json
     - /your/server/path/staph:/watch/staphylococcus_aureus
     - /your/server/path/staph2:/watch/staphylococcus_aureus_2
     - /your/server/path/kleb:/watch/klebsiella_pneumoniae
     - /your/server/path/ecoli:/watch/escherichia_coli

The host-side path (left of the colon) is wherever the data lives on the server.  The container-side path (right of the colon) must match what is written in ``watch-dirs.json``.

``watch-dirs.json`` is bind-mounted into the container and must be world-readable.  Run this once after editing the file:

.. code-block:: bash

   chmod 644 automation/watch-dirs.json

If the file is not readable the container will log ``event=watch_config_error`` at startup and the watch thread will not run.

Then set in ``.env.automation``:

.. code-block:: bash

   CHEWBBACA_WATCH_CONFIG=/watch-dirs.json
   CHEWBBACA_WATCH_INTERVAL=24   # optional, default is 24 hours

Every ``CHEWBBACA_WATCH_INTERVAL`` hours the container scans each listed directory and runs the pipeline with any TSV files not seen before, using the profile name from the config.

Files are tracked by MD5 hash in MongoDB.  Re-copying a file with identical content is a no-op — only new or changed files trigger a run.  Files are never moved or deleted by MIMOSA.

The automation container runs as UID 1000, so watched directories and their contents must be readable by that user.  Set a default ACL on each watched directory so that all files dropped into it are automatically readable without manual ``chmod``:

.. code-block:: bash

   setfacl -d -m u:1000:rX /path/to/watched/directory

For files already present, run a one-time fix:

.. code-block:: bash

   chmod -R 644 /path/to/watched/directory/*

Permissions
-----------

The automation container runs as a non-root user (UID 1000).  Pipeline output is written to ``./volumes/automation_tmp``, which is mounted from the host — host file permissions therefore apply.

If the pipeline fails silently or produces no output, the directory may not be writable by UID 1000.  Fix it with:

.. code-block:: bash

   sudo chown -R 1000:1000 volumes/automation_tmp

Then restart the service:

.. code-block:: bash

   docker compose restart mimosa-automation

Logs
----

Container logs are written to stdout and to ``.mimosa-automation.log`` at the repository root.  Key log events:

.. list-table::
   :header-rows: 1
   :widths: 40 55

   * - Event
     - Meaning
   * - ``event=automation_start``
     - Container started, scheduler loop beginning.
   * - ``event=trigger_server_start port=8081``
     - HTTP trigger server is ready to accept requests.
   * - ``event=trigger_skipped reason=already_running``
     - A run was requested while one was already in progress.
   * - ``event=pipeline_exit_error exit_code=N``
     - The pipeline process exited with a non-zero code.
   * - ``event=pipeline_retry``
     - A transient error occurred; retrying (max 2 attempts).
   * - ``event=pipeline_failed``
     - Pipeline failed after all retries; failure alert sent if configured.
   * - ``event=watch_start profiles=N interval_hours=…``
     - Watch directory thread started with N profiles loaded from config.
   * - ``event=watch_trigger files=N``
     - N new TSV files found; pipeline run starting.
   * - ``event=watch_skip reason=already_processed count=N``
     - N files were recognised as previously processed and skipped.
   * - ``event=watch_error error=…``
     - An error occurred during a directory scan; the thread will retry next interval.

