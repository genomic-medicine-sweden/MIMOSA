Deployment
==========

Prerequisites
-------------

- `Docker <https://docs.docker.com/get-docker/>`_ ≥ 24 and Docker Compose ≥ 2.20
- A running `Bonsai <https://github.com/SMD-Bioinformatics-Lund/bonsai>`_ instance if Bonsai is to be used for fetching allele profiles and sample metadata.  MIMOSA can run without Bonsai if allele profiles are imported manually via the chewBBACA import page or the command line (see :doc:`pipeline`).

Installation
------------

.. code-block:: bash

   git clone https://github.com/genomic-medicine-sweden/MIMOSA.git
   cd MIMOSA
   vi .env   # edit DOMAIN and JWT_SECRET at minimum
   docker compose up -d

MIMOSA is then available in the browser at ``http://localhost:3000``.

.. note::

   If using the automation service, also update ``.env.automation`` — see :doc:`automation`.

.. note::

   MIMOSA requires MongoDB running as a replica set to detect outbreaks and dispatch notifications.
   The provided ``docker-compose.yml`` handles this automatically.
   If connecting to an external MongoDB instance, configure it with ``--replSet rs0``.

Environment variables (``.env``)
---------------------------------

.. list-table::
   :header-rows: 1
   :widths: 30 55 15

   * - Variable
     - Description
     - Required
   * - ``DOMAIN``
     - Hostname where MIMOSA is reachable (e.g. ``rosalind.example.com``)
     - Yes
   * - ``BACKEND_PORT``
     - Port the backend listens on (e.g. ``5000``)
     - Yes
   * - ``FRONTEND_PORT``
     - Port the frontend listens on (e.g. ``3000``)
     - Yes
   * - ``BONSAI_PORT``
     - Port of the Bonsai service (used in frontend URL construction)
     - Yes
   * - ``MONGO_URI_INTERNAL``
     - MongoDB connection string used by backend and automation inside Docker (e.g. ``mongodb://mongo:27017/mimosa?replicaSet=rs0``)
     - Yes
   * - ``JWT_SECRET``
     - Secret key for signing JWT tokens — use a long random string
     - Yes
   * - ``PUBLIC_ORIGIN``
     - Full public origin of the frontend, including scheme and port (e.g. ``https://rosalind.example.com:3000``). Overrides the default ``http://<DOMAIN>:<FRONTEND_PORT>``.
     - No
   * - ``NEXT_PUBLIC_API_URL``
     - Base URL the browser uses to reach the backend API (e.g. ``http://rosalind.example.com:5000``)
     - No
   * - ``NEXT_PUBLIC_BONSAI_URL``
     - Base URL of the Bonsai service shown in the frontend
     - No
   * - ``SECURE_COOKIES``
     - Set to ``true`` to mark auth cookies as ``Secure`` (requires HTTPS)
     - No
   * - ``MIMOSA_RELATIVE_URL_BASE``
     - URL prefix if MIMOSA is served under a sub-path (e.g. ``/mimosa``)
     - No

Reverse proxy / subpath
^^^^^^^^^^^^^^^^^^^^^^^^

Leave all optional URL variables empty for standard local or direct deployments.
For most non-standard setups, only ``PUBLIC_ORIGIN`` and ``MIMOSA_RELATIVE_URL_BASE`` need to be set.
The remaining URL variables (``NEXT_PUBLIC_API_URL``, ``NEXT_PUBLIC_BONSAI_URL``) are for advanced setups with separate internal/external routing.

HTTPS
^^^^^

Set ``SECURE_COOKIES=true`` when serving MIMOSA over HTTPS.  This sets the ``Secure`` flag on the auth cookie.  Do **not** set this for plain HTTP — it will break login.

Python environment (manual pipeline only)
------------------------------------------

Only needed if running the pipeline manually outside Docker (see :doc:`pipeline`):

.. code-block:: bash

   conda create -n mimosa python=3.11 -y
   conda activate mimosa
   pip install -r automation/requirements.txt

Verifying the installation
--------------------------

A test suite uploads three artificial samples (``TEST1``, ``TEST2``, ``TEST3``) to confirm MIMOSA handles uploads correctly:

.. code-block:: bash

   python test/test.py --credentials credentials.json

On success, the samples appear in the database and are visible in the dashboard.
To remove them afterwards:

.. code-block:: bash

   python test/test.py --credentials credentials.json --delete

Updating MIMOSA
---------------

.. code-block:: bash

   git pull
   docker compose build --no-cache
   docker compose up -d

