Configuration
=============

ReporTree parameters
--------------------

The default clustering parameters used by `ReporTree <https://github.com/insapathogenomics/ReporTree>`_ are set in ``scripts/constants.py``:

.. code-block:: python

   REPORTREE_DEFAULTS = {
       "threshold": 9,   # maximum allelic distance within a cluster
       "method": "MSTreeV2",
       "analysis": "grapetree",
   }

``threshold`` is the maximum allelic distance between two samples for them to be placed in the same cluster.

To use different parameters for a specific organism, add an entry to ``REPORTREE_PROFILE_PARAMS``.  Only the fields that should differ from the defaults need to be listed:

.. code-block:: python

   REPORTREE_PROFILE_PARAMS = {
       "klebsiella_pneumoniae": {
           "threshold": 7,
       },
   }

In the example above, *Klebsiella pneumoniae* uses a stricter threshold of 7 while all other profiles continue to use 9.

QC filtering
------------

MIMOSA can filter out samples received from Bonsai that do not meet a quality-control standard.  Only samples with a ``QC_Status`` field matching one of the allowed values are included in the pipeline.

.. code-block:: python

   # Accept any QC status — no filtering (default)
   ALLOWED_QC_STATUSES = set()

   # Accept only samples that passed QC
   ALLOWED_QC_STATUSES = {"passed"}

.. note::

   This setting applies only to samples fetched from Bonsai.  Samples imported directly via the chewBBACA import page are always included regardless of QC status.

Outbreak rules (``backend/src/config/outbreak-rules.json``)
------------------------------------------------------------

Controls how MIMOSA detects outbreaks and which clusters trigger alerts.

.. code-block:: json

   {
     "default": {
       "detectionThreshold": 2,
       "requireCountyResolution": true,
       "alertVisibilityDays": 14,
       "alertMinGrowthForRefresh": 2
     },
     "profiles": {
       "staphylococcus_aureus": {
         "detectionThreshold": 3
       }
     }
   }

The ``"default"`` block applies to every analysis profile.  A named entry under ``"profiles"`` overrides only the fields it specifies for that profile — the rest are inherited from ``"default"``.

Fields
^^^^^^

``detectionThreshold``
   Minimum cluster size to be flagged as an outbreak.

``requireCountyResolution``
   When ``true``, samples that cannot be mapped to a county (via postcode or hospital coordinates) are excluded from cluster counts.  Clusters where no sample resolves to a county are not reported.

``alertVisibilityDays``
   Days of inactivity after which a banner alert is collapsed (not deleted).  Set to ``null`` to keep alerts expanded indefinitely.

``alertMinGrowthForRefresh``
   Minimum cumulative growth required to reset the visibility timer.  Example: with a value of ``2``, a cluster growing from 5 → 6 does not reset the timer, but a further increase to 7 does (cumulative growth = 2).

Map configuration (``backend/src/config/map-config.ts``)
---------------------------------------------------------

MIMOSA can display sample locations on a regional map.  The active country map is controlled entirely from the backend — no frontend changes are needed.

Three countries are pre-configured: ``sweden``, ``uk``, and ``norway``.  To switch, change ``ACTIVE_MAP`` at the top of ``map-config.ts`` and rebuild the backend:

.. code-block:: typescript

   const ACTIVE_MAP = 'norway' as const;

Postcode and hospital coordinates are used to resolve a sample's geographical location to a region on the map.  Without these files, samples can still be imported and clustered, but they will not appear as markers on the map and will be excluded from outbreak detection rules that require county resolution (see ``requireCountyResolution`` above).

Adding a new country
^^^^^^^^^^^^^^^^^^^^

Add an entry to the ``configs`` object in ``map-config.ts``.  Region boundaries can come from a local GeoJSON file, an external API (by country code), or both:

.. code-block:: typescript

   denmark: {
     activeMap: 'denmark',
     bounds: [[54.5, 7.5], [58.0, 15.5]],
     center: [56.0, 10.5],
     regionNameKey: 'shapeName',
     postcodePrefix: '',
     postcodeLength: 4,
     boundariesApi: { countryCode: 'DNK', level: 'ADM1' },
   },

``boundariesApi``
   Fetches boundaries at startup from `geoBoundaries <https://www.geoboundaries.org>`_ using an ISO 3166-1 alpha-3 country code and admin level (``ADM1`` = first-level regions such as counties or states).  No local file required.

``boundariesFile``
   Filename (relative to ``geodata/``) of a local GeoJSON ``FeatureCollection`` where each feature's ``properties`` contains the region name field matching ``regionNameKey``.  If both are set, the local file takes precedence and the API is used as a fallback if the file is missing.

Optionally add ``geodata/<country>-postcode-coordinates.js`` and ``geodata/<country>-hospital-coordinates.js`` to enable marker placement from postcodes or hospital names.  Rebuild the backend after any changes.

Pending samples expiry (``backend/src/config/pending-samples.ts``)
-------------------------------------------------------------------

Unmatched pending sample entries are deleted automatically after ``expiryDays`` days via a MongoDB TTL index.  The default is 30:

.. code-block:: typescript

   export const pendingSamplesConfig = {
     expiryDays: 30,
   };

Change the value and rebuild the backend to apply.


