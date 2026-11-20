# Admin Missing contact implementation plan

**Goal:** Add a protected, filterable Missing contact page under Admin Portfolio inventory and provide a fresh data and storage-readiness assessment.

**Architecture:** A dedicated Admin subroute reads the existing full inventory API and derives gaps from exact stored detail labels. The separate readiness report compares the active inventory and public projection with saved source captures without promoting or rewriting records.

**Tech stack:** Existing Python Admin HTTP service, vanilla JavaScript, shared Admin CSS/table styles, Playwright and Python validation scripts.

**Spec:** [Admin author and contributor gaps design](admin-author-contributor-gaps-design-2026-11-18.md)

## Global constraints

- No new branch, commit, push, external publish, or tenancy upload.
- Keep author and contact details behind authenticated Admin endpoints.
- `Owner Group` does not substitute for `Owner Email`; GitHub acknowledgement fields are outside this page's coverage rule.
- Default the queue to missing main WMS author email; group support and technical email coverage into one secondary criterion.
- GitHub acknowledgement contributors do not count as additional contact coverage.
- Do not change or promote source data while the existing candidate gates remain unresolved.
- Preserve unrelated working-tree changes.

## Review focus

- Group-only owner rows must still count as missing WMS author email.
- The four author/additional-contact combinations must reconcile to the full inventory record count.
- The default queue must contain every row missing the main author, regardless of whether an additional contact exists.
- Support-only and technical-only contacts must both satisfy the same additional-contact filter.
- All user/source text is safely rendered and export handles commas, quotes, and formula prefixes.
- Unauthenticated Admin requests remain behind the sign-in gate.
- Empty results, page boundaries, and narrow viewports remain usable.

## Tasks

### Task 1 — protected Admin coverage page

**Files:** `dev/scripts/admin-server.py`, `dev/scripts/admin_shell.py`, `dev/admin/inventory.html`, new Admin page JS/CSS, `dev/scripts/build-admin-service.py`, Admin browser tests.

- Write and run a failing browser test using four inventory fixture rows: both missing, author only, contributors only, and both present. Verify the default OR result, independent filters, clear, pagination, and protected route.
- Add an Inventory link and authenticated subroute; keep the sidebar's existing Portfolio inventory item active.
- Implement row derivation from `Owner Email`, `Acknowledgement Author`, and `Acknowledgement Contributors`; show owner groups separately.
- Add grouped compact filters, useful inventory dimensions under `More filters`, sorting, synchronized top/bottom pagination, and filtered CSV/XLSX/JSON export.
- Add the new assets to the Admin service package allowlist and verify service build/read-back.

### Task 2 — source and data audit

**Files:** New dated report under `dev/reports/` and inspectable calculation JSON.

- Reconcile missing author/contributor coverage in the full and public inventory projections.
- Compare source dates, collection coverage, parser/schema issues, and unresolved records for WMS, LiveLabs views, GitHub history, and Jenkins QA.
- State whether any observed gaps are source missingness, mapping/collection gaps, parser loss, or intentionally omitted table columns.
- Do not update the active snapshot unless all existing source/governance gates are resolved by supplied evidence.

### Task 3 — stability and upload readiness

- Run the feature tests, current source validator, relevant project checks, Admin-service archive smoke, and strict Object Storage preflight against an isolated candidate only if the package can be built without changing the active upload bundle.
- Record exact pass/fail counts, release ID, privacy boundary, current source dates, and all promotion blockers.
- Leave the source server available for local review and report the tested Admin URL.
