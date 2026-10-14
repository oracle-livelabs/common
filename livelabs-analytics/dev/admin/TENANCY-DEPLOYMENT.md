# Tenancy administration deployment

Admin login requires the Python service to run. Uploading files to Object Storage
alone cannot execute the service, verify a secret password, or protect admin API
data. Do not upload `.private`, the credential text file, or the SQLite database
to a bucket, static site, GitHub, or a container image.

## Service deployment on a tenancy host

Build `dev/scripts/build-admin-service.py --output <new-archive.zip>`. Upload this
credential-free archive to the approved application host and extract it as the
service project directory. Python 3.10 or newer is required. The service itself
uses only Python's standard library.

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
`/admin-panel-login`, `/api/admin/*`, `/admin-assets/*`, `/assets/admin-login.js`
and `/assets/admin-login.css` to the service. Shared `/assets/*` and dashboard
paths can be served by the service as well, or by the existing static origin
under the same application domain. Hosting the entire service under a URL path
prefix requires additional URL configuration; the current routes assume origin
root.

Public-origin mode marks session cookies Secure and checks mutations against
the configured HTTPS origin. Keep the service port private; only the gateway
should reach it. Use the platform's process supervisor and a persistent disk
mounted at `<project>/.private/admin` when deploying as a container. Configure
the platform's internal access controls for the intended audience.

## Dashboard, search and inventory routes

The dashboard's canonical entry is `/dashboard/#overview`. Section links use
`/dashboard/#top-performers`, `/dashboard/#at-risk-content`, and the other section
IDs. Record results from every entry point use `/search/?livelabs_id=...&wms_id=...`;
query-only search uses `/search/?q=...`. Inventory browsing remains `/inventory`,
including `?q=...` text filters and `?wms_id=...` family filters. The URL identifies
the view; both search and inventory read the same canonical portfolio JSON.
The service redirects `/`, `/index.html`, `/dashboard`, and
`/dashboard/index.html` to `/dashboard/`, preserving queries and incoming hashes.
The application adds `#overview` only when no section or search identity was supplied.

Record links on old dashboard, root or inventory paths redirect to `/search/`,
preserving query parameters. A WMS ID alone on an inventory URL remains a family
filter; on a dashboard/search URL it remains a record lookup and may be ambiguous.
LiveLabs ID and fallback content keys continue to identify individual records.
An empty `/search/` returns to the dashboard overview.

For static hosting, serve `/dashboard/` from `dashboard/index.html` (directory
index or gateway mapping). Redirect the legacy dashboard paths above to
`/dashboard/`, retaining query strings and fragments. Beneath a static application
prefix, apply these rules beneath that prefix. Include the generated
`dashboard/index.html` in every uploaded release. Asset and data routes remain
at the application root, not under `/dashboard/`.

Also serve `/search/` from `search/index.html`, with directory-index support or an
exact gateway mapping. Redirect `/search` and `/search/index.html` to `/search/`,
retaining queries. Static entries canonicalize old record URLs in the browser;
the Python service performs the redirect before serving HTML. Gateways can mirror
that query-aware routing, but must preserve inventory WMS-family filters. Apply
existing audience access controls to this new route just as for the dashboard.

The service now serves the inventory directly at `/inventory`. Both
`/inventory/` and `/inventory/index.html` redirect to `/inventory`, preserving
query parameters (including WMS-family filters). Route all three paths to the
service when using the service deployment.

For a static origin behind a gateway, configure these exact mappings:

| Public request | Gateway behavior |
| --- | --- |
| `/inventory` | Serve the root `index.html` with HTTP 200; retain `/inventory` in the browser and preserve the query string |
| `/inventory/` | Redirect to `/inventory`, preserving the query string |
| `/inventory/index.html` | Redirect to `/inventory`, preserving the query string |
| `/assets/*` and `/inventory/data/*` | Serve the matching static file without the HTML fallback |

If the static dashboard lives at a path prefix, apply the mappings beneath that
prefix and serve its root `index.html`. Do not rewrite data or asset requests to
HTML. The application derives its asset base from the shared loader script, so
changing the displayed route does not change data-fetch URLs.

Without gateway rewrites, directory-index web servers can still serve
`/inventory/`, and the explicit `/inventory/index.html` remains a complete static
entry point. Object Storage URLs require the exact object key unless a gateway
provides the clean route. Configure the gateway before using `/inventory` as a
public entry point on that hosting arrangement.

Both release builders regenerate dashboard, search and inventory entries from the shared dashboard
shell. Upload the entire new release, including `assets/js/page-loading.js` and
`assets/css/page-loading.css`, together. The overlay waits for required data,
initial assets and fonts, and rendering; failed loads offer a retry. The large
portfolio payload is requested when inventory, search, or comparison needs it.

## Static administration limitations

Continue uploading the existing static dashboard bundle. Administration requires
an additional backend and same-origin gateway routing before its protected pages
can be available. A frontend-only login would expose its password or verifier to
every browser and cannot enforce access to admin data.

This package is prepared locally. No tenancy host, gateway, DNS or deployment has
been configured by this task.
