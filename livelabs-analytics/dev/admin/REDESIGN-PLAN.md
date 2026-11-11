# LiveLabs Analytics public-scope redesign

## Goal

Make the author-facing dashboard, search, tables, and scores describe the same published public content that Jenkins scans. Keep the full inventory and disabled or archived records behind Admin. Remove replacement recommendations and replacement scores from the author experience and ranking calculations.

## Verified data boundary

The current Analytics snapshot contains 2,293 records. A record is eligible for the author-facing dashboard when both source fields say `publishType = Public` and `publishStatus = Published`. That yields 894 records: 615 workshops and 279 sprints. All 894 have a resolved publish-type classification. Workflow status is not an additional eligibility check: a record that is still marked public and published remains in the cohort until WMS changes those source fields.

The other 1,399 records stay in the full Admin inventory. They include private, disabled, event, unclassified, and non-published items. Do not use those records for author-facing search, ranking, review queues, statistics, or Jenkins score joins.

## Plan and acceptance checks

### 1. Establish a safe public data projection

- [x] Add a reproducible builder for the public-only inventory projection.
- [x] Use the same eligibility rule in dashboard data, search, ranked tables, statistics, and Jenkins joins.
- [x] Keep the full source JSON out of static release packages and unauthenticated routes.
- [x] Verify the projection contains 894 records from the current snapshot and no excluded publish types or statuses.

### 2. Put full inventory and disabled/archived review under Admin

- [x] Add an authenticated `/admin/inventory` page that loads the full inventory through a protected Admin API.
- [x] Move disabled and archived review into that protected inventory experience.
- [x] Redirect old public inventory routes to Admin and verify anonymous requests cannot read the full JSON.
- [x] Add an Inventory link to Admin navigation; keep it out of author navigation.

### 3. Reshape the author dashboard and search

- [x] Center the primary search on Overview and show results inline there.
- [x] Move search into the shared hero banner and keep the same banner and color strip on every author-facing page.
- [x] Search only public/published records by title, LiveLabs ID, WMS ID, author, keyword, and Jenkins issue text.
- [x] Keep individual record detail links available and make the detail layout easier to scan.
- [x] Remove Top Performer and P1 summary cards and the Review pages list from Overview.
- [x] Put compact portfolio counts, Jenkins coverage, Jenkins-scored items, and P1 findings directly below the banner.
- [x] Keep Portfolio Stats on Overview; remove its separate page and navigation link.
- [x] Rename Errors & fixes to At-risk.
- [x] Remove Inventory, Disabled & Archived, and Replacements from author navigation.

### 4. Recalculate rankings without replacement inputs

- [x] Rebuild author-facing ranked tables from the eligible cohort.
- [x] Keep P1 findings in their own urgent action table on At-risk.
- [x] Use P2/P3 findings for Jenkins Error Score and the existing 25% table blend where a report score is available.
- [x] Apply the existing Analytics-plus-Jenkins blend and final-score sort to all six performance, at-risk, and retirement tables.
- [x] Keep the score method in a collapsed explanation on At-risk; remove it from Top Performers.
- [x] Remove replacement fields and calculations from author tables. Preserve old replacement assets in a non-public archive for reference.
- [x] Keep missing Jenkins evidence unknown; do not treat it as zero errors.

### 5. Apply Redwood styling to Admin

- [x] Align Admin login and pages with the app's Oracle Redwood colors, type, spacing, and navigation.
- [x] Keep task labels short and use consistent Admin navigation, including Inventory.

### 6. Validate the finished local preview

- [x] Run the existing dashboard validator and browser checks.
- [x] Build a static release candidate and inspect its contents for private inventory, disabled records, and replacement assets.
- [x] Check public route scope, inline search behavior, and the Admin authentication boundary in a browser.
- [x] Leave the local server running and provide direct links to Overview, focused review pages, search detail, Admin, and Admin Inventory.

## Review after implementation

The public projection is a local build from the 28 September 2026 snapshot; it does not prove that WMS or Jenkins has refreshed since that snapshot. The applied Jenkins snapshot has 924 catalog items and 899 matches to the full inventory. Thirty-eight of those matches are outside the current public cohort; 861 match the 894 public records (96.3%). The remaining 33 public workshops have no Jenkins match, and 25 source report items do not map to Analytics. The dashboard shows coverage as `861 of 894` and leaves unmatched records on their Analytics baseline. A refreshed report or reviewed mapping is still needed to close the data gap.

The Overview keeps four compact stats below the shared banner and removes performer cards, the Review pages list, and the standalone stats page. All six ranking tables blend their existing Analytics score with Jenkins Error Score and sort by that final score. The updated local preview passed 80 static checks and 10 browser tests, including score and sort-order assertions for every ranked table. The prior release checks were local only; authenticated Admin page interiors still need review in an authenticated browser session.
