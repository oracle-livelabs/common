# Tenancy administration deployment

Admin login requires the Python service to run. Uploading files to Object Storage
alone cannot execute the service, verify a secret password, or protect admin API
data. Do not upload `.private`, the credential text file, or the SQLite database
to a bucket, static site, GitHub, or a container image.

## Service deployment on a tenancy host

Build `dev/scripts/build-admin-service.py --output <new-archive.zip>`. Upload this
credential-free archive to the approved application host and extract it as the
service project directory. Python 3.10 or newer is required. The HTTP service uses
Python's standard library; publishing Admin visibility changes also requires
Node.js 18 or newer for the public projection builder. Keep the reviewed
`dev/config/dashboard-policy.json` with the service and source build inputs.

Configure credentials interactively on the host:

```sh
python dev/scripts/admin-server.py --configure
```

Alternatively, with the local service stopped, transfer its
`.private/admin/admin.sqlite3` through a private administrative channel to the
same project-relative location on the host. This preserves the existing password,
captured snapshots and review history. Never distribute the initial password
file as part of the deployable archive. Restrict the runtime directory to the
service account and maintain an encrypted backup.

Start the service behind an HTTPS reverse proxy or approved gateway:

```sh
python dev/scripts/admin-server.py --host 127.0.0.1 --port 4175 --public-origin https://YOUR-APP-HOST
```

Replace the placeholder with the exact origin users open, with no trailing slash
or path. The gateway must preserve that Host header. It must route
`/admin`, `/admin/*` (including saved Jenkins report files), `/api/admin/*`, `/api/dashboard-admin-state`,
`/admin-assets/*`, `/assets/admin-login.js`, and `/assets/admin-login.css`
to the service. Shared `/assets/*` and dashboard
paths can be served by the service as well, or by the existing static origin
under the same application domain. Hosting the entire service under a URL path
prefix requires additional URL configuration; the current routes assume origin
root.

Public-origin mode marks session cookies Secure and checks mutations against
the configured HTTPS origin. Keep the service port private; only the gateway
should reach it. Use the platform's process supervisor and a persistent disk
mounted at `<project>/.private/admin` when deploying as a container. Configure
the platform's internal access controls for the intended audience.

To export saved QA report runs in Data Merge, mount or copy the QA automation
report archive on the service host and set `LIVELABS_ADMIN_QA_REPORTS_DIR` to its
`reports` directory. The service reads local run summaries; it does not connect
to a Jenkins server.

## Dashboard, search and inventory routes

The canonical source is `dashboard/index.html`. The dashboard uses
`/dashboard/?view=performance`, `?view=urgent`, `?view=at-risk`, and
`?view=retirement`. The service redirects legacy root/dashboard entries to
`/dashboard/`. Search and record details use `/search/?q=...` and
`/search/?livelabs_id=...&wms_id=...`. LiveLabs ID identifies an individual
record; WMS ID groups related records and can be ambiguous by itself.

Full inventory browsing is protected at `/admin/inventory`; the service
redirects legacy `/inventory` routes there. `/api/admin/inventory` requires an
admin session. Do not map the full inventory JSON into a static origin.

For Object Storage behind a gateway, map `/dashboard/` to
`dashboard/index.html` and `/search/` to `search/index.html`. Preserve queries
and apply equivalent mappings under any application prefix. Object Storage
alone requires exact object keys; clean directory routes need gateway rules.
Serve `/assets/*` and the public inventory JSON as files, never as an HTML
fallback. Route protected Admin paths and `/api/dashboard-admin-state` to the
service if that mode is used; include `/admin/inventory` in those routes.

Explicitly run `python dev/scripts/build-page-entrypoints.py` after reviewing a
canonical page edit. It synchronizes root, search and legacy inventory shells
from the dashboard. Both release builders validate page parity without writing
source. The static builder also checks the generated public projection; run the
explicit data synchronization workflow after a source refresh, then validate
before packaging. A web release omits the duplicate `file://` inventory payload
by default; `--include-file-fallback` is an optional offline packaging mode.

Upload a complete immutable release, including its loader, CSS and public JSON.
The current frontend eagerly requests the large public inventory during startup;
tab fragments are lazy but include their full generated table contents. Payload
splitting and paginated queries remain planned performance work.

A plain static package does not include the saved Jenkins overlay. Before
promotion, either export and wire a reviewed public-cohort QA snapshot into the
frontend, or provide the same-origin API. Local service results do not prove
that an Object Storage deployment will show the same QA scores.

## Static administration limitations

Continue uploading the existing static dashboard bundle. Administration requires
an additional backend and same-origin gateway routing before its protected pages
can be available. A frontend-only login would expose its password or verifier to
every browser and cannot enforce access to admin data.

This package is prepared locally. No tenancy host, gateway, DNS or deployment has
been configured by this task.

## Objectives

Describe the intended tenancy deployment boundary and the Analytics Admin routes it would expose.

## Estimated Time

Estimated Time: About 10 minutes to review the deployment notes.

## Acknowledgements

The package was prepared locally. This document records intended configuration and explicitly leaves tenancy deployment unverified.
