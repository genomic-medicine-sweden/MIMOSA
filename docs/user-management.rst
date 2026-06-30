User Management
===============

MIMOSA has two user roles:

- **admin** — full access: can create users, manage samples, access the Import and Pending Samples pages, view system logs, and access Swagger UI.
- **user** — read access: can view clusters, outbreaks, samples, and manage their own notification preferences.

Creating users
--------------

**Via the command line**

Run the following from the repository root on the host where the containers are running:

.. code-block:: bash

   docker compose exec mimosa-backend ./scripts/mimosa create-user \
     --fname=<first-name> \
     --lname=<last-name> \
     --m=<email> \
     --p=<password> \
     --r=<role> \
     --county=<county>

``--r`` accepts ``admin`` or ``user``.  ``--county`` is the user's home county and is used to pre-filter the map and notifications.

**Via the admin panel**

Admins can also create users from the **Admin** page in the dashboard.  Navigate to **Admin** in the sidebar, then use the *Create user* form.

Creating an automation user
---------------------------

The automation pipeline authenticates as a dedicated service account that cannot log in through the browser.  Create one with:

.. code-block:: bash

   docker compose exec mimosa-backend ./scripts/mimosa create-automation-user \
     --fname=<first-name> \
     --lname=<last-name> \
     --u=<username> \
     --p=<password>

At least one of ``--u`` (username) or ``--m`` (email) is required.  Once created, add the username and password to ``.env.automation`` (see :doc:`automation`).
