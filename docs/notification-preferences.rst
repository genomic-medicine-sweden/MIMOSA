Notifications
=============

Once email notifications have been enabled by an admin (see :doc:`notifications`), each user can configure their own preferences from the **Settings** page in the dashboard.

- **Outbreak Alerts** — enable or disable email notifications entirely.
- **Frequency** — receive alerts immediately, or as a daily (08:00) or weekly (Monday 08:00) digest.
- **Alert Threshold** — per-profile minimum case count required to trigger a notification for that user.
- **Pipeline Failures** *(admin only)* — receive an email when the automation pipeline encounters errors.  Alerts are sent to all admin users who have this option enabled.  For manual pipeline runs, use the ``--email`` flag instead (see :doc:`pipeline`).
