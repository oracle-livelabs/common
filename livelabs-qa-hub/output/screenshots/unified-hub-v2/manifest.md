# Unified QA Hub review

Captured 2026-11-04T17:51:30.975Z against http://127.0.0.1:4192/. Installed Chrome, isolated context. Real local framework inventory and saved report projections; created records exist only in the disposable test browser.

- 01-dashboard__r01-c01.png: 1440 × 1000, full page; http://127.0.0.1:4192/
- 02-tests__r01-c01.png: 1440 × 1000, full page; http://127.0.0.1:4192/#section=tests&view=board
- 03-finding-detail__r01-c01.png: 1440 × 1000, full page; http://127.0.0.1:4192/#section=bugs&view=board&record=AF-d67c0d439105bbea3fd7&kind=bugs
- 04-bug-board__r01-c01.png: 1440 × 1000, full page; http://127.0.0.1:4192/#section=bugs&view=board
- 05-test-plans__r01-c01.png: 1440 × 1000, full page; http://127.0.0.1:4192/#section=plans&view=board
- 06-mobile-bugs.png: 390 × 844, full page; http://127.0.0.1:4192/#section=bugs&view=board
- 07-mobile-dashboard.png: 390 × 844, full page; http://127.0.0.1:4192/#section=dashboard&view=board
- 08-mobile-detail.png: 390 × 844, full page; http://127.0.0.1:4192/#section=dashboard&view=board&record=AF-d67c0d439105bbea3fd7&kind=bugs

- PASS: Framework adapter returns current collection and saved report evidence
- PASS: Current source, catalog guards, and historical-only tests are separate
- PASS: Reader is GET-only
- PASS: Unlisted TMS files are not mounted
- PASS: Dashboard is the main Hub entry point
- PASS: Dashboard metrics derive from current framework collection
- PASS: Old reports are explicitly marked as historical evidence
- PASS: All integration menu routes exist
- PASS: Test board has five workflow columns
- PASS: Catalog setup guards are visible and not placed in Ready by default
- PASS: Findings are imported for triage
- PASS: Bug drag updates its local workflow
- PASS: Notes are escaped and saved locally
- PASS: Deep link restores selected finding and local edits
- PASS: Recorded failure remains visible after workflow changes
- PASS: Finding links to its test
- PASS: Logging a linked bug reuses an existing open finding
- PASS: List and board share every imported test
- PASS: Current-source filter excludes historical-only records
- PASS: Search shows useful empty state
- PASS: Manual tests have their own local origin
- PASS: Manual outcomes require and retain evidence
- PASS: Manual test can create a linked local bug
- PASS: Plan from filtered view selects only matching tests
- PASS: Plan membership and counts are visible
- PASS: Plan members link to real test records
- PASS: Requirements link to selected test cases
- PASS: Requirement links are bidirectional
- PASS: Test-plan links are visible in test details
- PASS: QA work supports the monthly roadmap
- PASS: Roadmap drag reschedules work without changing its workflow
- PASS: Run history retains recorded totals
- PASS: Run results link back to tests
- PASS: PAR unavailable state is not presented as healthy
- PASS: Existing on-call synthetic review is integrated
- PASS: Unavailable live on-call does not fall back to synthetic data
- PASS: Local workspace can be backed up
- PASS: Refreshing source evidence preserves local triage and notes
- PASS: Browser storage retains local changes, not imported evidence or support cases
- PASS: TMS entry opens the canonical shared Hub origin
- PASS: Mobile has no page-level horizontal overflow
- PASS: Mobile navigation switches the shared workspace
- PASS: Mobile detail remains within the viewport
- PASS: Escape dismisses the detail panel
- PASS: No runtime errors in integrated flows
- PASS: Unavailable reader is explicit and does not fall back to demo evidence

Runtime errors: 0

## Lossless slices

Original capture dimensions are recorded below; every tile is a pixel-exact PNG crop with a 64-pixel overlap.

- Original `01-dashboard.png` (1440 × 1000; 1 × 2 tiles): [01-dashboard__r01-c01.png](01-dashboard__r01-c01.png), [01-dashboard__r01-c02.png](01-dashboard__r01-c02.png)
- Original `02-tests.png` (1440 × 1000; 1 × 2 tiles): [02-tests__r01-c01.png](02-tests__r01-c01.png), [02-tests__r01-c02.png](02-tests__r01-c02.png)
- Original `03-finding-detail.png` (1440 × 1000; 1 × 2 tiles): [03-finding-detail__r01-c01.png](03-finding-detail__r01-c01.png), [03-finding-detail__r01-c02.png](03-finding-detail__r01-c02.png)
- Original `04-bug-board.png` (1440 × 1000; 1 × 2 tiles): [04-bug-board__r01-c01.png](04-bug-board__r01-c01.png), [04-bug-board__r01-c02.png](04-bug-board__r01-c02.png)
- Original `05-test-plans.png` (1440 × 1000; 1 × 2 tiles): [05-test-plans__r01-c01.png](05-test-plans__r01-c01.png), [05-test-plans__r01-c02.png](05-test-plans__r01-c02.png)

## Objectives

Map each review capture to its linked lossless PNG tiles.

## Estimated Time

Estimated Time: About 5 minutes to review this evidence set.

## Acknowledgements

Capture context is recorded in this manifest and the related project review notes.
