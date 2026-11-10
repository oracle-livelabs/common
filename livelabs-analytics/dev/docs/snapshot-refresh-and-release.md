# Snapshot refresh and release

Status on 8 November 2026: local fixes and release preparation are implemented. Lucian will supply the new source files later. The current candidate uses the 28 September WMS/views snapshot and the 15 October Jenkins run. It must not be promoted as fresh data.

## Inputs to retain together

- WMS inventory export, Sprint classification export, views workbook, and the four product/role/focus/sales-play tag exports identified by `dev/config/snapshot-source-manifest.example.json`.
- Actual source snapshot date and explicit start/end dates and cumulative/disjoint definitions for view windows. The current 7-day/14-day figures are not suitable for trends without that clarification.
- Full Jenkins JSON export with run ID, timestamp, item identities, check counts and findings. Preserve its matching HTML report if supplied. A matching ID alone does not establish a completed inspection.
- Refreshed workshop-path Git evidence or evidence-backed Admin content dates where available. WMS/views refresh does not refresh old Git or replacement evidence.

The existing workbook is title-based. Shared-title demand stays provisional. If the next export provides stable LiveLabs IDs, inspect its actual schema and add an ID mapping before enabling that new join; do not infer identifiers from titles.

## Stage and inspect

Copy the example manifest, replace its date and filenames, and record source period definitions. Optional `sha256` entries are checked; every input hash is recorded in the staged readiness report regardless.

```powershell
python -X utf8 dev/scripts/prepare-snapshot-refresh.py --snapshot "<source-folder>" --manifest "<manifest.json>" --jenkins-report "<fresh-jenkins.json>" --output "dev/snapshots/<new-review-folder>"
```

The directory must be new. This validates source dates, presence, hashes and Jenkins import, then creates before/after captures, full and public inventory, all three public tables, score explanations, a public-only offline fallback, diagnostics and readiness evidence. It does not replace live data or apply QA. Keep the full inventory and readiness material private.

Review additions/removals, publication fields, missing/duplicate identities, type changes, shared-title demand, source dates and period semantics. Compare raw and normalized Jenkins IDs/counts and preview the merge. Confirm preview/apply score validity and P1/P2/P3 separation. Apply to the refreshed inventory only after reconciling the inputs; preserve the previous source bundle and private Admin state for rollback. Do not clear old evidence dates merely because the build date is newer.

Use Admin Portfolio inventory for both public and non-public removal requests. Review a representative set of Workshops and Sprints before revising separate type thresholds or score weights. Approval is distinct from confirmation that WMS retired the item. Neither a missing row nor an unpublished flag proves retirement.

## Rebuild and verify

After the reviewed source has been integrated, regenerate the public projection, fragments, score sidecar, offline fallback and page entrypoints. `npm run sync:public-data` from `dev/config` includes the score sidecar. Run:

```powershell
python -X utf8 -m unittest discover -s dev/tests -p 'test_*.py'
node dev/tests/test-author-report.mjs
node dev/tests/test-jenkins-adapters.mjs
node dev/scripts/validate-dashboard.mjs
node dev/node_modules/@playwright/test/cli.js test --config dev/config/playwright.config.cjs --workers 2
python -X utf8 dev/scripts/export-dashboard-state.py --output "dev/reports/<reviewed-state>.json"
node dev/scripts/build-static-release.mjs --output "dev/releases/<candidate>" --dashboard-state "dev/reports/<reviewed-state>.json"
node dev/scripts/verify-static-release.cjs --release "dev/releases/<candidate>" --output "output/screenshots/<candidate>"
node dev/scripts/preflight-object-storage.mjs --release "dev/releases/<candidate>" --access-model internal-authenticated --browser-evidence "output/screenshots/<candidate>/browser-evidence.json" --strict --report "dev/reports/<candidate>-preflight.json"
```

The QA export is cohort-scoped and bound to the public inventory hash. Packaging rejects stale exports and excludes implicit QA files from bulk asset copying. Browser evidence is bound to the exact release manifest. Historical recovery of 99 deleted files is no longer a recurring release prerequisite; optional recovery evidence is still checked if supplied.

Clear `fresh_data_pending` and the governance/retirement verification flags only after the new source and resulting queues have been reviewed. Rebuild and revalidate the final candidate after changing those declarations. Keep contact-bearing output behind the already specified authenticated delivery boundary.

Upload the static directory contents under the manifest's immutable release prefix, using correct HTML/JSON/JS/CSS/font content types. The Admin service ZIP is a separate authenticated runtime, not website content and not an upload to the public static prefix. Validate the uploaded objects and routes, switch the approved stable route, then smoke-test it. Preserve the previous release prefix and route for rollback. No upload or route change was performed in this implementation.

## Objectives

Describe how to stage, inspect, rebuild, and verify a refreshed Analytics release before publication.

## Estimated Time

Estimated Time: About 10 minutes to review the release procedure.

## Acknowledgements

No upload or stable-route change was performed; contact-bearing Admin output remains within the authenticated delivery boundary.
