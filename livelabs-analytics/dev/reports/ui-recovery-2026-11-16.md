# Analytics UI recovery — 16 November 2026

## Finding and recovery boundary

The reported regressions were real. The active `main` checkout at
`848e2251f862cd6a4868abb0c957a5c4628dc893` contained older dashboard and detail-page
implementations. The requested UI was preserved in
`ba8e91e7cce957dc7842fd5d18c81fe2a61d91a0`, on the existing Analytics preparation
branch. Restoring only the sidebar had not restored that implementation.

Recovered the related runtime, Admin, generator and test files as a set in the
current `main` working tree. No new branch was created; nothing was pushed or
deployed. Newer private-data and candidate-output safeguards were retained.

The ignored `archive/recovery-20261116-141237/` directory holds the pre-recovery
patch, original files and their hashes, a consistent SQLite backup, screenshots,
release checks and the final source manifest. Do not upload this directory.
No user credentials, saved Admin history or raw source inventory were replaced.

## Recovered behavior

| Area | Result |
| --- | --- |
| Dashboard tables | `#` first, simple table search/type/sort controls, consistent grouped review filters, visible-page exports and pagination |
| Contact search | Owner and additional WMS contact email searches work in all four dashboard tabs and Views |
| Views | Additional contact column/filter, styled CSV/XLSX/JSON menu, export status follows the current page, navigation above and below results, internal control dividers removed |
| Record navigation | Dashboard, P1 and Views rows open item details directly; no row expansion or Open record button; direct startup does not fetch dashboard table fragments |
| Details | Full-width branded banner, merged ownership/publishing/performance cards, view counts, available additional contact, concise tooltips, detailed QA evidence, no Back to Dashboard buttons |
| Admin | Weekly dated runs, persistent checklist progress, restored management/merge/inventory layouts; inventory numbering and exports follow the selected page |
| Loading | Full-page loading gate protects incomplete metrics and UI; missing QA remains unavailable rather than being reported as zero |
| Packages | Views included in both static and Admin packages; private supplemental contact assets rejected by builders |

Recovery also fixed direct-detail return navigation, ambiguous WMS-family result
selection, the risk-score explanation, invisible weekly-update buttons and
mobile run-picker spacing. These are corrections to the recovered implementation.

## Data integrity and access

- Full inventory: **2,293** records. Dashboard: **889** public eligible records,
  consisting of **610 Workshops and 279 Sprints**.
- **Zero changes to the 889 public record bodies or their score values** during
  recovery. Generated evaluation metadata moved from 10 to 16 November; generated
  file hashes were reconciled. This does not change source freshness.
- Retained QA projection: **861** matched items, **91 P1 findings across 77 items**,
  and **449 items with P2/P3 findings**.
- Recovered **559** additional WMS contacts from the preserved private candidate,
  matched by LiveLabs ID. Missing contacts were not invented or inferred from
  GitHub authors.
- Supplemental contacts stay in `.private/admin/views-contacts.json` and are
  returned by a no-store service endpoint. Loopback previews can read it; remote
  access requires an Admin session. They are not included in static assets or
  release ZIPs. See [deployment instructions](../admin/TENANCY-DEPLOYMENT.md#additional-wms-contacts).
- The data retains its recorded **2026-09-28** source snapshot and **2026-10-15**
  QA report date. No fresh collection was performed during this UI recovery.

## Verification

| Check | Observed result |
| --- | --- |
| Full Chromium regression suite | **44 passed** in one run; local live server plus isolated Admin test service |
| Python tests | **106 passed** |
| Dashboard validator | **86 passed, 0 warnings, 0 failures** |
| Static artifact acceptance | **104 passed**, at root, GitHub Pages and release-path prefixes; desktop and mobile layouts |
| Generated page entries and score baseline | Match the source generators |
| Static access-material pattern scan | No matching private keys, GitHub tokens or OCI PAR tokens; limited pattern scan, not a full security audit |
| Strict release preflight | **16 passed, 3 blocked**: source freshness, governance snapshot verification, retirement-output verification |

The tests cover filtered/sorted/paginated downloads, email search, browser
history, exact item identity, direct details startup, P1 separation, QA failure
states, detailed evidence, Admin authentication, saved weekly runs and desktop/
mobile layouts. Admin mutation tests use an isolated database, not the user's
saved state. Screenshots were visually inspected as well as captured.

Static artifact identity:
`2026-09-28-snapshot-refresh-1815f2890fa91071`.
Manifest SHA-256:
`5135322905ac9f71f085928c900b089df023bdb9f384fdc9682d3e574127b3ec`.
The strict preflight blockers were retained; they were not bypassed to obtain a
passing release status.

## Review and assessment

The previous recovery was inadequate because it restored visible symptoms without
checking the complete earlier UI contract. This recovery is **8.5/10**: the
requested local behavior is recovered with regression and artifact evidence, but
the user's final review and a separately verified publication remain outstanding.
It is not a claim that the tenancy release is ready.

Before publication:

1. Review this exact local version, then include runtime files, generators and
   regression tests in one coherent change on the agreed branch. Compare the
   complete diff; do not apply a whole old stash or overwrite security changes.
2. Run browser acceptance against the built release under the deployment path,
   and bind the result to its manifest hash. Repeat that check after publishing.
3. Resolve the freshness and governance gates separately. Provision private
   contacts and Admin state through the authenticated service; static Object
   Storage alone cannot provide those capabilities.

Local review: [Dashboard](http://127.0.0.1:4176/dashboard/?view=performance),
[Views](http://127.0.0.1:4176/views/),
[item details](http://127.0.0.1:4176/search/?livelabs_id=4336&wms_id=12015),
[weekly Admin workflow](http://127.0.0.1:4176/admin/weekly-update).
