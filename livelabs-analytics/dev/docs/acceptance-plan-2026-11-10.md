# Analytics acceptance and tenancy readiness plan

Requested scope: user-facing UI and data first; then the Admin cleanup workflow. This is a test plan and execution ledger, not a declaration of production readiness.

## Environments and evidence

- Live GitHub Pages: read-only reproduction, route/assets/data checks. A PR merge does not prove a complete deployment.
- Local authenticated service: current inventory and saved QA projection; no destructive tests against the user's database.
- Isolated Admin service: temporary database and synthetic credentials for create/edit/delete, merge, session and failure tests.
- Exact static release: API absent, root and nested deployment prefixes, desktop and mobile, manifest-bound results.
- Tenancy: deployment, authentication gateway, headers, object MIME types and rollback smoke tests remain pending until an actual target is available.

## Acceptance matrix

| Area | Required checks | Evidence / exit condition |
| --- | --- | --- |
| Source inventory | Full/source/public counts, unique LiveLabs identities, WMS family multiplicity, Workshop/Sprint splits, exclusions and publication states | No dropped/duplicated eligible rows; every exclusion explained |
| Source freshness | WMS, demand, Git and Jenkins dates; source hashes and run IDs | Build date never substitutes for source date; stale inputs remain flagged |
| Demand | Missing versus zero, shared-title attribution, numeric parsing, negative/outlier values, cumulative window consistency | Unknowns never treated as zero; ambiguous demand remains provisional |
| Scores | Recompute every displayed baseline and final score, type-relative percentiles, rebalanced missing weights, P2/P3 formula, P1 independence | Tables/details/export agree; invalid QA cannot improve or penalize baseline |
| Cleanup | Removal requests, grace/keep-active exceptions, missing contacts, review bands, Workshop/Sprint threshold sensitivity | Suggestions stay separate from verified WMS retirement |
| QA import/merge | Full JSON, CSV, paired files, wrong run/counts, duplicate/ambiguous IDs, partial checks, skipped/unknown status, source locations, masked PAR links | Exact identity/run matching; reject ambiguous pairs; preserve evidence and occurrences |
| Storage | API vs static parity, public-only projection, DB persistence, immutable archives, report hashes, staged writes, backup/restore | No private DB/archive in static release; reproducible state and rollback |
| Tables | All four dashboard tables; IDs/order, type filters, per-column search, sorting, pagination/reset, counts, expansion, copies and exports | Values and identities unchanged through interactions |
| Search | Every dashboard tab, root/search deep links, ID/title/author/keyword, no matches, special characters, shared WMS families, browser Back/Forward | Exact LiveLabs record opens; query and selection survive navigation |
| Error details | What/where/count/date, exact source/lab/line, URL validation, redaction, missing-evidence state | Every reported location preserved; unknown QA never displayed as a clean result |
| Routes/assets | Root/dashboard/search/inventory/Admin aliases, query strings, trailing slash, nested base path, local links/images/fonts/CSS/JS | No accidental domain-root redirects or missing first-party assets |
| External links | Parse all destinations; sample public LiveLabs/GitHub URLs without credentials; separate redirects/timeouts/auth restrictions | Invalid links are failures; inaccessible/auth-only targets explicitly unverified |
| UI/accessibility | Desktop/mobile, overflow, tab keyboard behavior, labels, focus, contrast, loading/empty/error states, reduced motion | Essential data reachable without hover; no clipped controls or page errors |
| Dynamic features | Search, filters, export/report generation, tag assignment, import/merge preview/apply, report history/retest views | Correct output and error/retry behavior; no unrelated generators are assumed to exist |
| Admin scope | Tags, data merge, Jenkins reports, portfolio inventory; sign-in/sign-out | Hide Data governance and existing account/settings entry points from normal navigation; preserve records/APIs |
| Admin security | Unauthenticated APIs, CSRF, sessions, path traversal, unsafe URLs/imports, private static paths | Existing security tests pass; local validation is not a penetration-test claim |
| Release | Manifest/hash/file parity, missing overlay, stale export, source mutation, package content, strict preflight | Full candidate cannot silently omit QA; no promotion with unmet evidence gates |

## Execution order

- [x] Reproduce missing QA on live Pages and identify its resource boundary.
- [x] Run initial Python and JavaScript checks; record failures without hiding them.
- [x] Restore local test prerequisites and run browser suites.
- [x] Fix missing-data semantics, release omission safeguards and publishing exclusions.
- [x] Simplify Admin navigation; test retained workflows in isolated state.
- [x] Audit full/source/public/QA data and storage; reconcile every displayed ranked score.
- [x] Build a reviewed static candidate from current saved state and test without the API at root and nested paths.
- [x] Run links/assets/search/failure checks and packaged Admin verification.
- [x] Record pass/fail/blocked coverage, severity, improvements and deployment steps in [the results](acceptance-results-2026-11-10.md).

## Scope and implementation constraints

Preserve source inventory, LiveLabs identities, current tags, archives and scoring policy. Use only reversible local changes; no push, remote deployment, WMS edits or new Jenkins execution. Do not fabricate fresh inputs, clear pending-evidence flags or claim complete external-link verification from a sample. Keep Data merge because it is required to integrate inventory with Jenkins. Hide optional navigation rather than deleting its data or implementation.

## Confirmed initial findings

1. Live Pages serves 889 public records but has neither the Admin API nor `assets/data/dashboard-state.json`; QA KPIs are unavailable and the P1 queue misleadingly says zero.
2. Live Pages also serves the 29 MB full inventory (2,293 rows), bypassing the local Admin-only boundary. Repository Pages exclusions must be corrected before the next publication.
3. The existing static-release verifier asserts wording removed by the recent compact-detail UI update; update it to verify values/behavior instead.
4. The source validator applies its static size budget to the private full inventory rather than the deployed public payload.
5. The local service had stopped before this run; initial connection-refused browser failures are an environment baseline, not application regressions.

New-source integration and actual tenancy deployment will be listed as blocked/pending when their prerequisites are absent. Coverage means the enumerated matrix, not an unsupported claim that every possible input or external system has been tested.
