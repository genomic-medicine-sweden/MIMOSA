SMTP
====

MIMOSA can send email alerts when genomic clusters grow and meet configured outbreak thresholds.
Notifications are disabled by default and require an SMTP server.

SMTP setup
----------

Set the following variables in ``.env``:

.. code-block:: bash

   NOTIFICATIONS_ENABLED=true
   SMTP_HOST=your.smtp.server
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_REJECT_UNAUTHORIZED=false
   SMTP_FROM=no-reply@example.com

Restart MIMOSA after changing these values.  To verify the configuration, send a test email:

.. code-block:: bash

   GET /api/mail/test

The email is sent to the authenticated user.  To send to a different address:

.. code-block:: bash

   GET /api/mail/test?to=other@example.com

Thresholds
----------

Two independent thresholds control when notifications are sent.

**Outbreak threshold** (system-wide, in ``backend/src/config/outbreak-rules.json``)
   The minimum cluster size for MIMOSA to consider a cluster an outbreak at all.  Clusters below this threshold are never surfaced to any user.  See :doc:`configuration` for how to set this per profile.

**Notification threshold** (per user, in Settings)
   The minimum cluster size required before a specific user receives an email.  Users set this in their own notification preferences — see :doc:`notification-preferences`.

Alert visibility
----------------

Outbreak alerts appear in the dashboard banner for as long as the cluster remains active.  After a period of inactivity (no meaningful growth), alerts are **collapsed** rather than deleted — they can be expanded at any time by clicking **Show older alerts** in the banner.  The full history is available on the **Notifications** page.

The following settings in ``backend/src/config/outbreak-rules.json`` control this behaviour:

.. list-table::
   :header-rows: 1
   :widths: 30 10 60

   * - Setting
     - Default
     - Description
   * - ``alertVisibilityDays``
     - ``14``
     - Days without meaningful growth before an alert is collapsed.  Set to ``null`` to keep all alerts expanded indefinitely.
   * - ``alertMinGrowthForRefresh``
     - ``2``
     - Minimum cumulative increase in cluster size required to reset the visibility timer.  With a value of ``2``, a cluster growing from 5 → 6 does not reset the timer, but a further increase to 7 does.
