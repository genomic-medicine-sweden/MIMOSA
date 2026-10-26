Configuration
=============


ReporTree parameters (``settings.yaml``)
-----------------------------------------

Clustering parameters used by
`ReporTree <https://github.com/insapathogenomics/ReporTree>`_ are configured
in ``settings.yaml``. MIMOSA supports GrapeTree-based clustering (MSTreeV2)
and hierarchical clustering (single-linkage or complete-linkage).

The default configuration uses GrapeTree with MSTreeV2 and an allelic
distance threshold of 9:

.. code-block:: yaml

   reportree_defaults:
     threshold: 9
     method: MSTreeV2
     analysis: grapetree

The parameters are:

``analysis``
   Clustering analysis (``grapetree`` or ``HC``).

``method``
   Clustering method (``MSTreeV2`` for GrapeTree; ``single`` or
   ``complete`` for hierarchical clustering).

``threshold``
   Allelic distance threshold used to define clusters.

When changing the clustering analysis, both ``analysis`` and ``method``
must be specified to ensure a compatible combination.

Per-profile overrides
^^^^^^^^^^^^^^^^^^^^^

Different clustering parameters can be specified for individual analysis
profiles using ``reportree_profile_params``. Only parameters that differ
from the defaults need to be provided.

For example, to use a threshold of 7 for *Klebsiella pneumoniae*:

.. code-block:: yaml

   reportree_profile_params:
     klebsiella_pneumoniae:
       threshold: 7

In this example, *Klebsiella pneumoniae* uses a threshold of 7 while
all other profiles continue to use the default threshold of 9.

To use single-linkage hierarchical clustering for *Staphylococcus aureus*:

.. code-block:: yaml

   reportree_profile_params:
     staphylococcus_aureus:
       analysis: HC
       method: single
       threshold: 9

For complete-linkage clustering, set ``method: complete`` instead.

All profiles without an override continue to use the default configuration.

QC filtering (``settings.yaml``)
---------------------------------

MIMOSA can filter out samples received from Bonsai that do not meet a
quality-control standard.  Only samples with a ``QC_Status`` field
matching one of the allowed values are included in the pipeline.

.. code-block:: yaml

   # Accept any QC status — no filtering (default)
   allowed_qc_statuses: []

   # Accept only samples that passed QC
   allowed_qc_statuses: ["passed"]

.. note::

   This setting applies only to samples fetched from Bonsai.  Samples
   imported directly via the chewBBACA import page are always included
   regardless of QC status.

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

The ``"default"`` block applies to every analysis profile.  A named entry
under ``"profiles"`` overrides only the fields it specifies for that
profile — the rest are inherited from ``"default"``.

Fields
^^^^^^

``detectionThreshold``
   Minimum cluster size to be flagged as an outbreak.

``requireCountyResolution``
   When ``true``, samples that cannot be mapped to a county (via postcode
   or hospital coordinates) are excluded from cluster counts.  Clusters
   where no sample resolves to a county are not reported.

``alertVisibilityDays``
   Days of inactivity after which a banner alert is collapsed (not
   deleted).  Set to ``null`` to keep alerts expanded indefinitely.

``alertMinGrowthForRefresh``
   Minimum cumulative growth required to reset the visibility timer.
   Example: with a value of ``2``, a cluster growing from 5 → 6 does not
   reset the timer, but a further increase to 7 does (cumulative
   growth = 2).

Map configuration (``backend/src/config/map-config.ts``)
---------------------------------------------------------

MIMOSA can display sample locations on a regional map.  The active country
map is controlled entirely from the backend — no frontend changes are
needed.

To switch the map, set ``ACTIVE_MAP`` in ``.env`` and restart the backend:

.. code-block:: bash

   ACTIVE_MAP=uk

If ``ACTIVE_MAP`` is not set, it defaults to ``sweden``.

For countries not configured in ``map-config.ts``, use the ISO 3166-1
alpha-3 country code — boundaries are fetched automatically from the
`geoBoundaries <https://www.geoboundaries.org>`_ API at startup.

To restrict the map to one or more specific counties, set ``COUNTY`` to a
comma-separated list of county names matching those in the boundaries
data:

.. code-block:: bash

   COUNTY=Cambridgeshire,Oxfordshire

When ``COUNTY`` is set, the county picker in Map Settings only shows the
listed counties.  Users can switch between them but cannot select counties
outside the configured set.  Omit ``COUNTY`` (or leave it empty) to show
the full country.


Postcode and hospital coordinates are used to resolve a sample's
geographical location to a region on the map.  Without these files,
samples can still be imported and clustered, but they will not appear as
markers on the map (unless coordinates are used) and will be excluded from
outbreak detection rules that require county resolution (see
``requireCountyResolution`` above).

Customising a country entry
^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you need custom bounds, a postcode prefix, or a local GeoJSON file for
a country, add an explicit entry to the ``configs`` object in
``map-config.ts``.  Otherwise the geoBoundaries API fallback is used
automatically.  Boundaries can come from a local file, the API, or both:

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
   Fetches boundaries at startup from
   `geoBoundaries <https://www.geoboundaries.org>`_ using an ISO 3166-1
   alpha-3 country code and admin level (``ADM1`` = first-level regions
   such as counties or states).  No local file required.

``boundariesFile``
   Filename (relative to ``geodata/``) of a local GeoJSON
   ``FeatureCollection`` where each feature's ``properties`` contains the
   region name field matching ``regionNameKey``.  If both are set, the
   local file takes precedence and the API is used as a fallback if the
   file is missing.

Optionally add ``geodata/<country>-postcode-coordinates.js`` and
``geodata/<country>-hospital-coordinates.js`` to enable marker placement
from postcodes or hospital names.  Rebuild the backend after any changes.

Pending samples expiry (``backend/src/config/pending-samples.ts``)
-------------------------------------------------------------------

Unmatched pending sample entries are deleted automatically after
``expiryDays`` days via a MongoDB TTL index.  The default is 30:

.. code-block:: typescript

   export const pendingSamplesConfig = {
     expiryDays: 30,
   };

Change the value and rebuild the backend to apply.

