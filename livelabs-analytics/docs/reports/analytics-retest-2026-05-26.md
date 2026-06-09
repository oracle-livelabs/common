# LiveLabs Analytics Retest - 2026-05-26

## Scope

This report captures the no-data-impacting QA hygiene pass for the static LiveLabs Analytics dashboard in the `common/livelabs-analytics` checkout.

The pass intentionally did not change:

- `data/*.json`
- `dashboard_tables.json`
- `dashboard_payload.json`
- ranking rows, scores, formulas, or visible table values

## Implemented

- Added favicon links to `index.html`, `login.html`, and `admin.html` using the existing local Oracle logo asset.
- Added `scripts/validate-dashboard.mjs` as a repeatable, non-mutating dashboard validation command.
- Preserved the current displayed data and all analytics payloads.

## Validation Command

Run from the `livelabs-analytics` folder:

```powershell
node .\scripts\validate-dashboard.mjs
```

Optional, when serving from another local URL:

```powershell
$env:DASHBOARD_URL = "http://127.0.0.1:4175"
node .\scripts\validate-dashboard.mjs
```

## What The Script Checks

- Inline JavaScript syntax for `index.html`, `login.html`, and `admin.html`.
- Duplicate IDs and missing local references in the three HTML entry points.
- Favicon link presence.
- JSON parsing for dashboard data files.
- Top Performer score formula consistency.
- Replacement Similarity formula consistency.
- Active ranked-output gating.
- Disabled content audit-only gating, including no QA Exception text in disabled JSON rows.
- Replacement identity exclusions.
- HTTP smoke checks when the local server is available.

## QA Position

The current formulas and displayed data are treated as sound. Future changes should avoid regenerating or editing dashboard payloads unless the team explicitly opens a data refresh task.
