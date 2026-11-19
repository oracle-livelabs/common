# Analytics data coverage and release readiness

Reviewed 18 November 2026. This review uses the active project payloads and the newest saved source candidate from `analytics_update_directory` (captured 11–12 November). No live WMS or GitHub source was fetched during this review.

## Decision

The protected author/contributor coverage page is ready for local review. The static bundle assembles and its file manifest verifies, but the project is **not ready for tenancy/Object Storage promotion**. The active portfolio remains based on a 28 September source snapshot, its newer WMS, views, GitHub, and Jenkins evidence has unresolved reconciliation gates, and the intended delivery must remain behind approved internal authentication because the static dashboard retains Oracle contact emails.

## Author and contributor coverage

The new Admin page uses the active full inventory and reports a row when either exact source field is missing. Missing markers include blank values, `N/A`, `Not reported`, and equivalent placeholders. WMS owner groups and GitHub acknowledgement author names remain visible as separate fields; they do not substitute for a WMS author email or GitHub contributor list.

| Active cohort | Records | Missing WMS author email | Missing GitHub contributors | Missing either | Missing both |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full inventory | 2,293 | 303 | 1,681 | 1,749 | 235 |
| Public/published dashboard | 889 | 99 | 608 | 632 | 75 |

The page is linked from Admin → Portfolio inventory. It supports text search, independent missing/present/any controls for each field, filters for type, category, publication, workflow, owner group, repository mapping and contact coverage, sorting, pagination, and CSV/XLSX/JSON export of the filtered results. It stays behind the existing Admin sign-in.

## Source reconciliation

- **WMS:** The newest saved candidate contains 2,334 rows: 1,818 exact LiveLabs ID matches, 466 unique WMS ID/title fallbacks, 40 new IDs, 10 rows without a baseline identity, and no ambiguous matches. Fifty content types remain unknown and 572 publish types are unresolved. Primary and Kitchen Sink reports match across 12 shared fields, but the Published route and WMS Published status differ by 6 route-only and 22 status-only IDs.
- **Views:** The supplied collection has 7,266 rows; 1,446 distinct IDs join to the current WMS set, 15 are outside WMS, and 412 WMS IDs have no views row. The Last Week source is unresolved: the candidate has 1,003 joined rows, while the report cites captures of 1,004 rows/41,240 views and 1,163 rows/967,365 views. Window semantics and completeness need approval. Active dashboard view metrics still carry the 28 September snapshot.
- **GitHub:** Repository capture is dated 12 November, while active repository/update evidence dates to 15/14 August. The candidate has 1,245 rows with commit history and 1,235 manifests confirmed at the recorded head; 11 complete-history rows lack that confirmation and 113 CSV event rows have no changed-file path. Changed content and path mappings still need review before using GitHub dates as freshness evidence.
- **Jenkins:** The saved report references the 15 October run, corrected on 6 November without rerunning checks. It covers 918 catalog items, and the matching detailed findings export is absent. The active release has no reviewed static Jenkins overlay.
- **Governance and contact data:** Tag and governance evidence remains dated 28 September and is flagged for refresh. The manifest requires internal-authenticated delivery and forbids public exposure; successful static packaging does not provide that gateway or prove its runtime configuration.

The 12 November WMS/views/GitHub files remain a **private, unpromoted candidate**. The existing review identifies missing types/tags, publication gaps, the Last Week discrepancy, incomplete GitHub evidence and contact-data review as promotion gates. I did not replace active inventory rows with that candidate.

## Consistency repairs made

The generated public projection already had the same 889 records and record content as the canonical inventory, but its policy review date was stale. I refreshed the projection metadata from the active canonical payload and updated its score-baseline source hash. The 889 baseline rows remained identical. The release manifest now records 889 public records and the canonical inventory generation time (`2026-11-16T15:57:33Z`); the underlying source snapshot remains `2026-09-28` and `fresh_data_pending` remains true.

## Stability and packaging evidence

- Full Playwright suite: **60 passed** with one worker. The default 10-worker run had 10 failures/timeouts; the sequential run was clean after correcting one test that expected 100 rows even when its Workshop filter matched 54.
- Python suite: **110 passed**.
- Dashboard validator against the review server: **89 passed, 0 warnings, 0 failures**.
- Admin service packaging: **84 files**, coverage route present, no credentials included. The temporary archive was removed after inspection.
- Static bundle assembly: **27 files / 24,218,709 bytes**. Preflight verified manifest hashes, public-only cohort, 889 unique IDs, page parity, assets, access-bearing material scan, and required tables.
- Strict Object Storage preflight: **15 passed, 0 warnings, 4 failures**. Remaining failures: fresh source snapshot, static Jenkins evidence, `governance_snapshot_verified`, and `retirement_outputs_verified`. Browser evidence was tied to the built manifest and the full 60-test run passed.

## Before promotion

1. Reconcile and approve a fresh WMS, dashboard views, and GitHub candidate; resolve the identity, type/publication, Last Week, and repository-history gaps.
2. Obtain a same-run detailed Jenkins findings export and run fresh checks, then approve the static QA projection.
3. Refresh and approve governance/tag and retirement outputs.
4. Complete the contact-data privacy review and verify the approved internal authentication gateway for the actual Object Storage route.
5. Rebuild the static bundle and rerun strict preflight after those source and governance gates pass. Deploy the Admin Python service and its private storage separately; the static bundle intentionally excludes Admin, credentials, and private inventory.

No branch, commit, push, PR, or tenancy upload was created by this review.
