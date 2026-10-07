# LiveLabs QA Hub requirements

Updated 5 October 2026. Current scope replaces the V3 prototype navigation and seeded operational dashboards.

## Purpose

Bring Jenkins CI evidence, PAR results, on-call review, QA Automation coverage and repository follow-up into one minimal workspace. Prioritize reviewable data, provenance and the next useful action.

## Pages and hierarchy

1. Overview: latest result counts, findings and source state.
2. On-Call: important cases, current drafts, source coverage and reports.
3. Jenkins Reports: run history, outcomes and immutable evidence.
4. PAR Links: broken/unverified results and incomplete scan coverage.
5. QA Automation: inventory, results, execution profiles and future run control.
6. Repositories: local inventory and future live PR/check queues.
7. Settings: connection status, access boundaries and freshness.

Analytics and Author Guide remain companion links. QA Operations, TMS, Knowledge Base, standalone domain card pages and duplicate report templates are absent from the current menu. Legacy URLs map to active pages. Old model helpers and historical section notes are retained for compatibility; they are not active pages.

## UI requirements

- One title and one concise description per page; avoid repeated page introductions and nested containers.
- Use Oracle Sans, Bark navigation, warm neutral backgrounds and functional link/status colors.
- Use shared tables with search, filtering where relevant, sortable column headers, counts, empty states and pagination.
- Keep technical details in expandable rows or dialogs; retain keyboard focus and accessible control labels.
- Desktop sidebar; compact expandable navigation on narrow screens. Horizontal overflow must remain inside tables.
- Preserve URL/history navigation, deep links and local demo-session restoration.
- Never populate operational metrics with obsolete seed data when a real source is unavailable.

## Data and provenance

- Local reports identify themselves as local artifacts; never imply Jenkins execution provenance without an actual build ID.
- Show source timestamps and stale state. The local preview uses a 24-hour stale threshold for reports; production thresholds are source-specific.
- Keep execution completion and quality findings distinct. Preserve raw report and Jenkins outcomes in the production contract.
- PAR `has_data:false` means not measured. Broken, unverified and unscanned-source counts stay separate.
- Spec files, expanded tests, catalog items and manifest files have different grains and must have explicit labels.
- Local repository timestamps are local commit dates; workflow files do not prove enabled or passing CI.
- On-call synthetic and private modes remain isolated. Unavailable live data never falls back silently to synthetic records.

## Roles And Permissions

The current demo login is a local presentation mechanism. It cannot authorize production jobs or protect a deployed API. Production requirements are Viewer read-only, Operator run/cancel/triage and Admin configuration, enforced on every server request. Keep private reviewer access distinct from general QA report access.

The local development server accepts read-only requests from its loopback origin and exposes no execution endpoint. Do not deploy it as an authenticated production service.

## Run requests

The current UI previews a profile and optional catalog item IDs only. Run tests is disabled. Production run requests require an approved job/environment allowlist, bounded parameters, server-held credentials, idempotency, queue/build/report correlation, audit and restart-safe persistence. Jenkins retains scheduling ownership.

## On-call requirements

Use the existing `hub-operations.v1` contract, four configured sources and exact revision-bound review rules. Show source health, changed/current cases, important issues, next human actions and draft version. Keep support data out of browser storage and public assets. Review approval, delivery, source resolution, reported recovery and learner verification remain independent facts.

## Integration and acceptance

Follow [the connected Hub plan](connected-qa-hub-plan.md) for phased integration, metric definitions, source ownership and acceptance gates. Live APIs, credentials, deployment and real test execution are future increments. Local rendering/build evidence must be reported separately from those capabilities.
