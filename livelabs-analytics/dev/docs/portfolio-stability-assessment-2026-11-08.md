# Portfolio stability assessment — 8 November 2026

Provisional overall grade: **B**. Local implementation: **B+**. Evidence readiness: **C**. Production promotion: **pending**. These are engineering judgments based on the checks below, not a claim that the content portfolio itself has been reviewed.

## Delivered

| Area | Result |
| --- | --- |
| QA validity | Unavailable/incomplete inspections, zero completed checks, invalid counts, unmapped findings and unexplained failures do not produce a clean-score bonus. Preview, apply, API and browser agree. P1 remains separate. |
| Retirement readiness | Provisional, evidence-checked, approved and explicit source-confirmed states are separate. Demand-based candidates require verified content and publication dates plus attributable demand. Missing demand enters evidence review. |
| Score explanations | Record details and CSV show components, effective weights, baseline/final scores and QA contribution. Missing contact is described as an assignment signal; QA as content hygiene. |
| Calibration | Admin compares demand thresholds separately for Workshops and Sprints with known-demand denominators and reviewed-decision counts. Existing weights/thresholds remain provisional and unchanged. |
| Full cleanup scope | All source records receive review metadata. Cleanup queues include removal requests from either status field, evidence gaps, unpublished/non-public records, obsolete/replacement decisions, contacts and approval awaiting WMS confirmation. |
| Refresh/release | Input date/hash checks, staged public artifacts, readiness diagnostics, cohort/hash-bound QA export, versioned static package, exact-package browser checks and separate Admin archive are available. |
| Earlier usability fixes | Public menu removed; login sidebar removed with an on-page return link; P2/P3 card separated from P1; post-login management uses the authenticated inventory endpoint instead of the removed public full-inventory path. |

## Current data and consequences

- 2,293 source records; 889 governed dashboard records (610 Workshops, 279 Sprints).
- 206 removal requests across both source status fields; only 5 are in the public dashboard cohort.
- 861 matched QA items: 833 scoreable, 24 inspection-unavailable, 4 without completed checks. The 28 unscoreable items keep baseline ranking. Findings remain visible, including 91 P1 entries and 449 items with P2/P3 findings.
- Retirement review: 5 lifecycle requests and 372 evidence reviews. No demand candidates currently meet all evidence requirements. There are no saved content-review decisions or verified first-publication dates in the current policy.
- Annual demand is missing for 55 Workshops and 5 Sprints. At ≤500 annual views, 16.6% of Workshops versus 81.0% of Sprints with known demand are selected. This difference is visible for calibration; it is not evidence that 81% of Sprints should retire.
- WMS/views snapshot remains 28 September; Jenkins remains the 15 October run; Git evidence remains older. A rebuild does not refresh any of them.
- 803 of 852 comparable records show a 7-day number greater than the 14-day number. Obtain actual period definitions before enabling trend calculations. The diagnostic does not assume those fields are nested cumulative periods.
- Current views are title-based. Shared metrics remain provisional. Stable-ID joins await an actual upstream export schema with those identifiers.

## Verification

- 79 Python tests passed, including incomplete QA, protected merge application, new-record publication provenance, readiness gates and source-wide cleanup coverage.
- 11 Playwright browser scenarios passed: authenticated login/management, cleanup filtering, source boundaries, every displayed ranked score, review bands, P1 queue, effective weights, CSV/copy behavior and desktop/mobile rendering.
- 80 application validation checks passed; author-report and Jenkins-adapter Node checks passed.
- Exact static candidate passed 6 browser checks with the API unavailable. Screenshots were visually inspected; browser evidence is bound to its release manifest.
- Separate Admin archive verified against its hashes and imported in an isolated temporary directory; all 2,293 records and both calibration types loaded.
- One independent source review found two P2 issues: apply discarded count-validity evidence, and new WMS records lacked required publication provenance. Both were reproduced and corrected with regressions. Unvalidated implicit QA-file copying was also prevented.

Candidate: `dev/releases/stability-20261108-final/`, release ID `2026-09-28-snapshot-refresh-7f372a8ea72ba9bf`.

Admin archive: `dev/releases/analytics-admin-stability-20261108-final.zip`. No credentials, database or private runtime state is included. The Admin archive contains the full inventory and belongs in the authenticated runtime, not public static storage.

Strict Object Storage preflight: **16 passed, 3 expected blockers** — fresh source snapshot, governance snapshot verification, retirement-output verification. No upload, production route change or retirement was performed. Work remains local and uncommitted; unrelated working-tree changes were preserved.

## Next steps

1. Supply the newer WMS/Sprint/views/tag exports and matching Jenkins JSON/report. Stage them using `snapshot-refresh-and-release.md`.
2. Reconcile identities, publication states, reporting periods, QA completeness and retained Git evidence; review the before/after changes.
3. Review representative Workshops and Sprints, recording dates, ownership/relevance/replacement evidence and outcomes. Use those outcomes to calibrate each type's thresholds and assess whether QA/contact weights should change.
4. Integrate the reviewed snapshot and QA merge, rerun checks, clear only verified promotion flags, then build and validate a new release. Publish its immutable prefix through the approved authenticated delivery route, verify it, and retain the previous release for rollback.

This is a safer decision-support workflow, not evidence that every workshop is correct or ready to retire. The new-data integration and production verification remain necessary before an A-grade release assessment.

## Objectives

Assess the current portfolio evidence, release readiness, and outstanding data and verification steps.

## Estimated Time

Estimated Time: About 10 minutes to review the assessment and next steps.

## Acknowledgements

The assessment distinguishes the dated local snapshot from new data integration and production verification, which remain pending.
