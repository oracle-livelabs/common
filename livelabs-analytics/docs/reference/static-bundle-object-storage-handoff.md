# Static Bundle Object Storage Handoff

Last checked: 2026-06-18

This `common/livelabs-analytics` project is the static holding bundle for the LiveLabs Analytics dashboard before any later move to Object Storage. Keep it deployable as ordinary static files: no OCI API server, wallet, Nginx, systemd, database environment, or VM-only files belong here.

## Bundle Root

Use this folder as the copy source:

```text
C:\Users\Lucian Brinzei\Desktop\Desktop\Projects\livelabs-repos\common\livelabs-analytics
```

The static entry points are:

- `index.html`
- `inventory/index.html`
- `admin/index.html`
- `admin.html`
- `login.html`
- `.nojekyll`

The static asset and data payload roots are:

- `assets/`
- `content/`
- `data/`
- `dashboard_payload.json`
- `dashboard_tables.json`
- `replacement_similarity.json`
- `wms_canonical.json`
- `workshop_updates.json`

The June discovery payloads are already part of this bundle:

- `data/full_content_search_index.json`
- `data/portfolio_inventory.json`

## Exclusions

Do not copy or publish these local-only paths:

- `_local/`
- `dataset/`
- `server/`
- `ops/`
- `node_modules/`
- `.chrome-admin-smoke-profile/`
- `test-results/`
- wallet, key, PEM, P12, SSO, JKS, `.env`, or `backend.env` files

The project `.gitignore` is the guardrail for these exclusions.

## Validation

Serve the bundle from its root:

```powershell
python -m http.server 4177 --bind 127.0.0.1
```

Then validate it:

```powershell
$env:DASHBOARD_URL = "http://127.0.0.1:4177/"
node scripts\validate-dashboard.mjs
```

Expected result for the checked bundle:

```text
Summary: 44 passed, 0 warning(s), 0 failure(s).
```

Also verify these static routes before copying to Object Storage:

- `/`
- `/index.html`
- `/inventory/`
- `/admin/`
- `/data/full_content_search_index.json`
- `/data/portfolio_inventory.json`

## Object Storage Notes

- Preserve relative paths exactly; the dashboard loads JSON, fonts, images, and route shells by relative URL.
- Keep `inventory/index.html` with the copied bundle so `/inventory/` can load the main dashboard shell.
- Set JSON files to `application/json`, HTML files to `text/html`, SVG files to `image/svg+xml`, and fonts to the appropriate font MIME type if the upload tool does not infer them.
- The Portfolio Inventory route can remain directly addressable while normal dashboard navigation is gated for manager review.
- Treat this bundle as a static snapshot. Fresh governance regeneration still requires the current dashboard export and WMS workbook sources.
