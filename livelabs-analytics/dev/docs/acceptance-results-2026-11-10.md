# Analytics acceptance review — 10 November 2026

**Decision: the corrected local public release is suitable for review, but production promotion is blocked.** Fresh source data, governance evidence and retirement-output review are still outstanding. GitHub Pages has not been republished. No WMS records, remote Jenkins jobs or tenancy objects were changed.

The [test plan](acceptance-plan-2026-11-10.md) defines the coverage and exclusions. Machine-readable evidence is in `dev/reports/acceptance-20261110/`. Results below distinguish local behavior, exact packaged files, the live Pages deployment and pending tenancy validation.

## Why the merged PR did not deliver the QA data

The live Pages dashboard loaded 889 public records, but `/api/dashboard-admin-state` and the static `assets/data/dashboard-state.json` were unavailable. The local applied Jenkins merge lives in the private Admin runtime; a source-code PR does not publish that state. Pages therefore displayed missing QA metrics and a misleading zero-row P1 queue.

The public Pages URL also served the approximately 29 MB full inventory. The local Python service protects that inventory, but publishing repository files directly bypasses its route protection. The reviewed static builder already excludes the full inventory; Pages was not serving that reviewed artifact.

Evidence: `github-pages-baseline.json` and `output/screenshots/acceptance-20261110/github-pages-baseline.png`.

## Fixes implemented locally

| Finding | Change | Verification |
| --- | --- | --- |
| Missing QA looked like zero findings | Missing metrics now say **Unavailable**; the urgent queue explains that no report is loaded | API/static-file failure regression; exact static candidate without QA |
| P1/detail links escaped the project prefix | Record URLs resolve against the application base; canonical entry links are relative | Root, `/common/livelabs-analytics`, and `/releases/acceptance` browser checks |
| A normal static build could omit QA | Complete release builds require an explicit reviewed `--dashboard-state`; incomplete previews require `--allow-missing-qa` | Missing, stale and old-validity exports rejected; existing candidate preserved |
| Newly uploaded sources could silently revert to an older selection | Explicit newly imported/edited version takes precedence over the previous selection | Regression seeds existing Analytics and QA versions before uploading, mapping and applying new files |
| Merge counts mixed items with QA rows | Labels explicitly distinguish matched inventory items, Analytics-only items and QA-only rows | Fixture: two matched items, six matched QA rows, one Analytics-only item, three QA-only rows |
| Applying QA appeared to refresh WMS inventory | Import/apply messages now explain matching snapshots, eligible public items and unchanged canonical inventory | Actual import, preview, CSV, apply, reload and API read-back |
| Unneeded Admin navigation | Four alphabetical entries: **Dashboard tags, Data merge, Jenkins reports, Portfolio inventory**; Data governance hidden, settings still redirected | Desktop/mobile retained routes, sign-in/out, report history and retest navigation |
| Public source-tree publishing exposed development/full-inventory paths | Parent Jekyll config excludes Analytics `dev/`, `output/` and the full inventory file | Config reviewed; next Pages build still needs live verification |
| Baseline sidecar had stale source binding | Regenerated its inventory hash; scores and components did not change | Builder checks and row-by-row score reconciliation |
| Validator budget inspected the private payload | Static size budget now measures the actual public payload | 80 checks passed, zero warnings/failures |

The Jekyll exclusions do not remove tracked files from Git history or make a public repository private. Retained contact-bearing data requires the project's authenticated delivery model; a public/redacted edition needs a separate reviewed data projection.

## Data reconciliation

| Measure | Verified result |
| --- | ---: |
| Full source inventory / unique record keys | 2,293 / 2,293 |
| Eligible public inventory / unique LiveLabs IDs | 889 / 889 |
| Public Workshops / Sprints | 610 / 279 |
| Matched Jenkins records | 861 |
| Public items without a matched report | 28 |
| Matched records with usable QA scoring | 833 |
| Matched records with unavailable inspection / no completed checks | 24 / 4 |
| Items with P1 / P1 finding entries / P1 occurrences | 77 / 91 / 238 |
| Items with P2 or P3 findings | 449 |
| P2 occurrences / unclassified occurrences | 1,383 / 184 |
| Public records with known / unknown annual demand | 829 / 60 |
| Public retirement-readiness records marked provisional | 889 |
| Recorded review decisions | 0 |

The two groups of 28 are different: unmatched records versus matched records whose inspections cannot support scoring. Neither group is a clean QA result. P1 findings, affected items and occurrences are different measures. There were no P3 occurrences in the applied data.

Identity remains LiveLabs ID. WMS ID is a family identifier and cannot uniquely identify a child record. The merge test proves ambiguous WMS families cannot be applied; unmatched records survive preview/CSV and do not receive another record's QA overlay.

All displayed performance/risk scores in the three ranked tables were checked against the baseline sidecar and current QA validity rules in the exact static release. Valid QA uses the existing P2/P3 error burden and 75% baseline / 25% QA blend. Invalid QA leaves the baseline unchanged. P1 remains a separate urgent-action signal. This validates implementation consistency, not the predictive value of the policy.

## Data limitations that remain

1. **Source age:** WMS, demand and tags are dated 28 September; Jenkins is the 15 October run; Git/update evidence is dated 14–15 August. A November build or import timestamp does not refresh that evidence.
2. **Retirement confidence:** all 889 public records remain provisional. Missing verified publication/substantive-update dates and missing reviewed outcomes prevent defensible retirement approval.
3. **Type calibration:** at 500 annual views, 92/555 Workshops with known demand qualify (16.58%), versus 222/274 Sprints (81.02%). These are demand-only threshold counts, not final retirement candidates; age and exceptions also apply. Keep separate type diagnostics and calibrate against reviewed outcomes before changing thresholds.
4. **Demand attribution:** 768 public items have unique-title matches, 93 share title-based demand, 23 have ambiguous unavailable attribution and five have no attribution. Prefer stable ID-based metrics when the source actually supplies them.
5. **Period semantics:** 803 of 852 comparable records have 7-day values above 14-day values. This requires the source's exact reporting-window definitions; it does not by itself prove corrupted values. Trend calculations remain disabled.
6. **QA comparability:** counts depend on completed checks, content length and coverage. Keep raw findings/locations and validity status alongside scores. Unknown priorities must remain reviewable, not silently treated as passed.
7. **External source links:** sampled instruction URLs for LiveLabs 633 and 685 return HTTP 404. Correct them from current owner/WMS evidence; no replacement URL was invented. Sprint IDs 3265, 3384 and 3264 reached the expected run-workshop titles in Chromium after redirects. Their full workshop execution was not tested.

## Coverage and evidence

| Layer | Result and evidence |
| --- | --- |
| Backend/domain | 84 Python tests passed: identity, eligibility, date boundaries, unknown inputs, QA validity, merge behavior, source preservation, redaction, private routes and CSRF. `python-tests.log` |
| Browser workflows | **24 distinct scenarios passed across the suite and targeted reruns.** The 22-scenario combined run had 21 passes and exposed the source-selection bug; the final six-scenario Admin rerun passed after its fix, as did the added public search and Admin inventory search scenarios. Includes source upload/apply persistence, assignment edits/removal/draft retry, table filters/sorts/paging, exact error locations, copy/HTML/CSV exports, navigation, keyboard tabs, mobile layout and auth boundaries. `browser-scenarios.json`, `browser-suite.log`, `admin-final.log`, `search-flows.log` |
| Exact static artifact | 98 checks passed against the manifest-bound candidate, with no Admin API, at three base paths. `static-candidate/browser-evidence.json` |
| Source/HTTP validator | 80 passed, zero warnings/failures. `validator.log` |
| JavaScript adapters/rendering | Both Node suites passed: escaping, masked URLs, source locations, count/date rendering, QA validity and matching JSON/CSV evidence |
| Release failure paths | Five checks passed: missing/stale/old-validity QA rejection, no implicit overwrite, no partial promoted output. `release-guards.json` |
| Admin archive | Nine packaged import/initialization/route/private-state checks. `admin-package.json` binds the tested ZIP hash |
| SQLite | Integrity `ok`; read-only backup has matching row counts for all eight tables. `database-integrity.json`; backup remains under `.private/admin/acceptance-20261110/` |
| Destination audit | All 889 production URLs are valid HTTP(S) destinations. 519 GitHub/instruction field values are valid URLs, 369 are absent and one access-bearing URL is deliberately withheld. Nine HTTP samples plus three browser redirect checks; not a crawl of every external page. `link-audit.json`, `external-redirects.json` |
| Strict promotion | **16 passed, three blocked**: fresh source snapshot, governance snapshot verification, retirement outputs verification. `preflight.json` |

Initial failures were retained in the logs: stopped local service, outdated UI assertions, missing test callback/context variables and premature interaction during loading. The full workflow run also exposed the real source-selection defect above; the failing regression was retained before its fix. A corrected mobile screenshot waits for loaded content; its earlier blank capture was not accepted as visual evidence.

There is no separate workshop generator in this application. Dynamic coverage targets its actual features: filtering/search, report and CSV generation, tags, imports, mappings and saved QA/report views.

Not executed: actual tenancy upload/gateway/SSO/rollback, production Admin mutations, remote Jenkins retests, live WMS edits, every external workshop/lab, native Excel/print-dialog inspection, screen-reader testing, Safari/Firefox or physical mobile devices, sustained multi-user load, or a penetration test. These are explicit deployment/follow-up checks, not implied passes.

## Storage and performance improvements

- Public inventory is 15,932,049 bytes; reviewed QA is 5,999,654 bytes. Measured gzip sizes are about 1.26 MB and 0.44 MB. Verify compression and correct MIME/cache metadata at the actual gateway.
- Split a compact ID/title/owner search index from lazily loaded record/QA evidence. Current serialized `searchable`, `details` and repeated `family` fields account for much of the payload. Preserve record IDs, export parity and every source location when reducing duplication.
- Keep immutable source files and run IDs, a validated normalized inventory, a separate QA overlay, and a content-hashed release manifest. Bind all regenerated tables/search/score files to one reviewed source cohort.
- Build the same reviewed artifact in CI and deployment. A source-folder Pages upload and a local Admin database are not interchangeable release inputs.
- Mark or retire the older `integrate-qa-governance.py` policy path after confirming callers. It has a separate severity model; passing its unit tests does not establish that the current Admin/P2-P3 policy was applied.
- Admin inventory filtering/pagination works, but its custom controls and merge preview samples differ from the shared public table component. Consolidate controls, sort/export behavior and mobile column affordances in a later focused change.
- Add scheduled authenticated link checks and retained failure history after the weekly source refresh is reliable. Keep report availability failures separate from content defects.

## Readiness assessment and next steps

Assessment is evidence-based judgment, not a formal certification: **local UI/workflows B+; data consistency B; source freshness and retirement confidence D; current published delivery D.** Overall: **not production-ready yet**.

1. **Finish the data refresh.** Supply fresh WMS/LiveLabs exports, source window definitions and full Jenkins JSON when available. Run `prepare-snapshot-refresh.py` into a new staging folder; review ID additions/removals, type/publication changes and demand attribution.
2. **Review cleanup evidence.** Resolve missing QA/coverage states, correct known broken source links and review representative Workshops/Sprints. Keep P1 repair separate from retirement. Do not clear verification flags merely to make preflight green.
3. **Rebuild one candidate.** Integrate the reviewed canonical inventory, regenerate public tables/search/baselines, apply the matching QA run, export the public state, then run the same tests and strict preflight.
4. **Deploy the public UI/data first through authenticated tenancy delivery.** Use the release directory contents, preserve its immutable prefix, configure directory-route mappings and query forwarding, verify object hashes/MIME/compression/access, then test the stable URL. Retain the old prefix for rollback. Do not upload the entire repository.
5. **Deploy Admin separately.** Use the credential-free service ZIP, private persistent SQLite storage, private report archives, HTTPS gateway and required Python/Node/Excel-import dependencies. Verify retained tags/merge/Jenkins/inventory flows against the deployed service.
6. **Close remote acceptance.** Repeat public counts, four tables, ID/owner/title search, detail links and Admin auth tests against the actual tenancy URL; test rollback before declaring production ready.

Current public candidate: `dev/releases/acceptance-20261110-candidate`, release ID `2026-09-28-snapshot-refresh-08ea501fb18a6725`. It contains the existing September/October evidence, not fresh source data. The source-refresh procedure is [snapshot-refresh-and-release.md](snapshot-refresh-and-release.md).

Final Admin archive: `dev/releases/acceptance-20261110-admin-final.zip`. The earlier baseline/candidate archives are retained for comparison; use the final archive identified by `admin-package.json`.
