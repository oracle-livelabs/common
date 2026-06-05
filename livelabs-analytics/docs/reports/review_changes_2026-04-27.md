# Review Changes - 2026-04-27

Target project:
`C:\Users\Lucian Brinzei\Desktop\Desktop\Projects\LiveLabs_Portfolio_Governance_Dashboard`

Corrected source bundle:
`C:\Users\Lucian Brinzei\Documents\codex\Tasks\livelabs-workshop-governance\Output\Dashboards\Current\LiveLabs_Analytics_Dashboard_2026-04-27_title_fix_r3`

## Scope

- Replaced the 5 root JSON payloads from the corrected bundle:
  `dashboard_payload.json`, `dashboard_tables.json`, `replacement_similarity.json`, `wms_canonical.json`, `workshop_updates.json`.
- Replaced all 73 files under `data\` from the corrected bundle.
- Preserved the project `index.html` so the existing dashboard behavior remains intact.
- Did not replace the rendered page with the smaller generated r3 dashboard.

## Validation

- Scanned 78 project JSON files for title fields with known bad strings, zero-width characters, control characters, replacement characters, and mojibake markers.
- Result: 0 suspicious title fields.
- Confirmed `data\top_retire_candidates_workshops_top_50.json` row 27:
  `Building an App using a Remote Data Source for Oracle Autonomous Cloud Services`.
- Confirmed row 27 replacement candidate:
  `Building an App using REST Data Sources for Oracle Autonomous Cloud Services`.
- Confirmed row 29:
  `Creating an App based on Existing Tables for Oracle Autonomous Cloud Service`.
- Confirmed row 29 replacement candidate:
  `Building a Proof-of-Concept for Oracle Autonomous Cloud Services`.
- Confirmed rendered `index.html` has 0 known old title strings, 0 zero-width-space variants, and 9 snapshot details blocks hidden by default.

## Remaining Source Limiter

Fresh governance reranking is still blocked because the current dashboard ranking workbook directory has no recognized ranking workbooks. This publish fix uses the latest verified title-fix bundle as the corrected data source.

## Review Prompt

Please review the changed project files before pushing to GitHub Pages.
