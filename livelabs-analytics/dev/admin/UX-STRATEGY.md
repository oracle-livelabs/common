# LiveLabs Analytics redesign

**Status:** Local implementation preview
**Scope:** Author dashboard, search and record details, review pages, Admin inventory, and Jenkins scoring

## Product direction

The author dashboard and Jenkins report must use the same content cohort. The current Analytics snapshot has 894 records marked `Public` and `Published`: 615 workshops and 279 sprints. Those records drive author-facing search, statistics, rankings, and Jenkins joins. Private, disabled, event, archived, and unpublished records stay in the full inventory under Admin.

The current snapshot is dated 28 September 2026. The local preview aligns its data scope with Jenkins; it does not refresh WMS or Jenkins data.

## Page structure

### Overview

- Keep the public-content search inside the shared hero banner on every author-facing page, with the color strip below the search.
- Keep search results inline on Overview.
- Show four compact stats below the banner: public/published total with workshop and sprint counts, Jenkins coverage, scored items, and P1 findings.
- Remove performer summary cards and the Review pages list. Authors can open the full ranking and review tables from navigation.
- Keep Portfolio Stats on Overview; do not provide a separate stats page or navigation item.

### Top Performers

Keep the full workshop and sprint ranking tables on the Performance page. Preserve the Analytics demand and freshness score, then apply a Jenkins adjustment when a matched score exists.

### At-risk

Show the P1 reviewer queue first. Put the P2/P3 scoring explanation in a collapsed section. Follow it with the at-risk review tables and Jenkins filters.

### Retirement

Keep the retirement tables on their own page. Rank candidates from available public demand, update age, and author/contact signals. Treat every row as a review candidate; do not automate a retirement action.

### Search and record details

Search title, author, LiveLabs ID, WMS ID, keywords, and matched Jenkins issue text. Search results stay on Overview. Selecting a result opens its record details with available Analytics and Jenkins evidence.

### Admin

Apply the Redwood palette and shared navigation to Admin pages. Put the full inventory under the authenticated `/admin/inventory` route. The inventory supports search and publishing filters, plus Jenkins priority and score where the item is in the public scan cohort. Nonpublic items are labeled outside Jenkins scope.

## Current data coverage

The Analytics snapshot has 894 public and published records: 615 workshops and 279 sprints. The applied Jenkins snapshot has 924 catalog items, of which 899 map to the full Analytics inventory. Of those, 38 are outside the current public cohort and 861 match it. That leaves 33 public workshops without a Jenkins match (96.3% coverage) and 25 report items that do not map to Analytics. The dashboard must show the matched count against the public total and keep unmatched items on their Analytics baseline. Do not treat missing Jenkins data as zero errors.

## Score policy

Join Jenkins findings by LiveLabs ID. Only public and published records receive Jenkins evidence in the author-facing experience. The applied report currently matches 861 of 894 eligible records; the 33 unmatched workshops need a refreshed or reviewed report mapping before full Jenkins coverage is possible.

P1 findings stay out of the error score and appear in the urgent action queue. For scored P2/P3 evidence:

```text
burden = 2 × P2 occurrences + P3 occurrences
Jenkins Error Score = 100 × burden / (burden + 20)
```

When the score is available, use a 25% Jenkins share:

- **Performance:** 75% existing Analytics score + 25% (100 − Jenkins Error Score)
- **At-risk and retirement:** 75% existing Analytics score + 25% Jenkins Error Score

Keep the Analytics baseline when Jenkins evidence is missing or unscored, and label that result provisional. Do not treat missing evidence as zero errors. Keep replacement tables and replacement-dependent calculations archived; they are not part of the current dashboard.

The at-risk and retirement Analytics baseline uses available signals: low-demand percentile at 50%, update age at 35%, and missing author/contact at 15%. Reweight the available components when a source value is missing. Retirement candidates currently require no more than 250 views in 12 months and more than 12 months since a meaningful update.

## Implementation status

- Public/published projection built from the canonical inventory, with related-record references filtered to the same cohort.
- Overview search uses the projection and displays Jenkins signals inline in result rows.
- The dashboard API derives the Jenkins Error Score for stored report overlays when it serves matched public records. The current applied report scores 861 matched items from P2/P3 burden; its 91 P1 findings remain in a separate queue.
- Performance, At-risk, and Retirement have focused routes. Portfolio Stats appears only at the top of Overview.
- Admin Inventory serves the full inventory through the protected API and includes Jenkins filters for public records.
- Replacement and disabled-content tables are removed from the author bundle; the historical replacement assets are kept in the Admin archive.
- Static release candidate excludes the full inventory, Admin files, and archived assets.
- The shared banner, search, four Overview stats, and reduced overview content have been checked in desktop and mobile browser renders.
- All six performance, at-risk, and retirement tables apply the existing Analytics score plus Jenkins Error Score, then sort by the final blended score.

## Review points

1. Confirm the 894-record cohort and the definition of `Public` plus `Published` against the current WMS export.
2. Review the compact Overview metrics and shared search banner.
3. Refresh or review the Jenkins mapping for the 33 public workshops without a match and the 25 report items that do not map to Analytics.
4. Calibrate the 2:1 P2/P3 weights and 25% table share against refreshed reports and reviewer feedback.

