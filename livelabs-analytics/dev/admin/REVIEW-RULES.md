# Review queues and calculations

The author-facing explanation is **What drives the score**, available in Top Performers, At-risk and Retirement review. Each section gives a short explanation of its own rules. Admin Portfolio inventory combines these explanations under **Table eligibility and calculations**. `dev/scripts/review_rules.py` is the shared evaluator and explanation source.

## Membership and priority

Only Public/Published records without reviewed test/training exclusions enter the dashboard. Individual LiveLabs identity controls decisions; WMS families and an author's other workshops are not affected.

Each dashboard tab has one table combining Workshops and Sprints. **Type** identifies the format; **Review focus** tags show why an item needs attention. Type and review-band filters narrow the selection. Choosing several focus tags includes items matching any of those tags. Counts describe items, not tags, so a record with several reasons appears once per table. Filtering never changes scores.

The Retirement review table contains three distinct kinds of work, labelled in **Review status**:

- **Immediate lifecycle review:** source Delete Requested in either workflow or publish status, a recorded owner request, confirmed obsolete/replaced content, or an explicit Admin-approved retirement. Traffic, grace and keep-active exceptions cannot hide a source request. Approval is a label from a saved decision, not an inferred score. No action here deletes or unpublishes content.
- **Retirement candidates:** strict annual demand ≤250 and verified substantive update older than 12 calendar months; broader ≤500 with the same age condition. Demand must be attributable to the record and first publication verified beyond the grace period. Without those checks, the record is provisional and enters evidence review.
- **Low-demand evidence review:** demand ≤500 with incomplete readiness evidence, missing annual demand, or an Admin request for more evidence. These are not counted as evidence-checked candidates. Possible recent content based on a completion date remains provisional until publication age is checked.

At-risk retains all eligible records. In addition to the above bands, at-risk priority uses ≤1,000 annual views and >12 months; watchlist uses ≤1,000 and >6 months. Higher-priority bands sort first, then final score within the band. Users can filter bands and sort other columns. Top Performers continues to sort by final score. Percentiles are calculated separately within each content type before the two types are combined for display.

P1 urgent action groups matched P1 findings by LiveLabs ID. Open a row to see every finding, its action and occurrence count. The item count can therefore be smaller than the finding count. A P1 issue adds a QA issues tag; it does not approve retirement. Public record details and Admin inventory use the same type and focus labels.

Initial absolute thresholds preserve the tier proposal evaluated with the user. Configuration is separately keyed for Workshop and Sprint in `dev/config/dashboard-policy.json`; it is not a claim that the same view count represents the same demand for both. Admin provides demand sensitivity at 100/250/500/1,000 views and configured thresholds, separately by type, with known-demand denominators and reviewed-decision counts. It also retains the read-only bottom-20%-within-type comparison. No percentile quota or weekly trend rule is silently activated.

## Confidence and scores

`review` on each projected record includes queue, band, reasons, confidence, recorded/scoring/Markdown update dates, demand mapping, review state and snapshot date. Private free-text review reasons, evidence references, actors and audit history do not enter this projection.

Repository/WMS proxies and commit subjects indicating maintenance (CDN, copyright, formatting, whitespace or typo work) do not contribute score freshness/age. This conservative subject-based flag is not a substitute for inspecting all content diffs. Other workshop-path activity can contribute the age term, labelled **Recorded activity only** rather than a verified substantive change. Admin may resolve this with an evidence-backed content-update date. Dates later than the source snapshot require a newer source batch.

Missing/ambiguous demand and uncertain dates produce evidence warnings. Missing demand is never zero. Annual and 90-day views are required for Top Performers. Its baseline weights are 45% annual-demand percentile, 35% 90-day percentile and 20% freshness. Freshness is 100 through 365 days, declining to zero at 730. Unknown freshness is omitted and the remaining weights are renormalized.

Risk baseline weights are 50% inverse annual-demand percentile, 35% update age capped at 36 months, and 15% missing individual/qualifying contact. Unknown components are omitted and remaining weights renormalized. Baselines round half up to two decimal places. A score ranks work; it does not determine table eligibility or retirement approval.

Jenkins error burden is `2 × P2 occurrences + P3 occurrences`; error score is `100 × burden / (burden + 20)`. With matched QA, final risk blends baseline with error score; final performance blends baseline with `100 − error score`. Default shares are 75% / 25%, with the existing configured share reflected in help. P1 remains a separate urgent remediation queue. Unmatched, unavailable, incomplete, zero-check, unmapped or unexplained-failure QA leaves the baseline unchanged. Failed content assertions can still be valid findings; infrastructure failure cannot be treated as a clean inspection. Check counts do not establish complete functional quality. P2/P3 occurrences currently mostly describe writing/content hygiene and vary with coverage and content length.

All eligible rows reach final scoring before pagination. Filtering does not recompute percentiles. Admin captures and the historical QA pilot consume the same performance baseline function so unknown freshness cannot break snapshot export. The capture algorithm is versioned v2 and its rankings now use the governed dashboard cohort; all original source records remain in the captured source bundle.

## Admin decisions

Admin evaluates every source record, while public eligibility stays unchanged. Cleanup queues cover removal requests, evidence needed, unpublished/non-public content, obsolete/replacement decisions, contact assignment, and approvals awaiting WMS confirmation. Only explicit source Retired/Deleted state confirms completion; disabled, absent or unpublished is not proof.

Portfolio inventory → Manage provides separate visibility and retirement-review forms. Review states are automatic rules, owner request, confirmed obsolete/replaced, approved retirement, keep active until review, and needs evidence. Decisions require reasons; approvals/obsolete confirmations and verified source dates require supporting evidence. Keep-active exceptions need a future expiry.

A verified first-publication date grants six months of demand-review grace; completion date alone adds a caution. A keep-active exception suppresses automated retirement selection until expiry but cannot hide a lifecycle request. These records remain in At-risk. P1 remediation remains visible independently.

Protected endpoint: `POST /api/admin/retirement-review`. Authentication, same-origin/CSRF validation, individual-record lookup, revision conflicts, date validation and required evidence are enforced server-side. Saving stages all projections/fragments, checks source integrity, promotes the result and records old/new policy in private audit history. The browser reads the result back before displaying success. No source records are rewritten.

Projection metadata includes source snapshot, policy revision and review evaluation date. Source data gates use the snapshot date; exception expiry uses the UTC build/evaluation day. A static export must be rebuilt for new decisions or expired exceptions. Individual file promotion is rollback-protected but is not yet an atomic version-pointer swap across concurrent readers.

## Regeneration and validation

Generate the public projection first, then performance/review fragments, `build-author-reports.py` for component/effective-weight explanations, and the offline fallback. Package builders validate reviewed outputs without regenerating them. Include `review_rules.py` and `review_presentation.py` in the Admin service archive; exclude private roster, credentials, databases and review audit history.

Run `python -m unittest discover -s dev/tests -p 'test_*.py'`, `node dev/scripts/validate-dashboard.mjs`, and the independent `audit_top` formula check in `audit-snapshot-integrity.py`. Exercise protected review writes on an isolated service copy, not the user's real decision store. Browser checks cover queue membership, band filters, default ordering, help text, mobile overflow and Admin save/read-back.

This feature does not refresh WMS, views or Jenkins, inspect every workshop diff, publish to Object Storage, or implement public server-side pagination. Those release/migration tasks remain separate.

Score details disclose baseline and final weights, unknown components, source confidence, retirement readiness and QA contribution. Missing contact remains an assignment signal; current weights are retained pending calibration against reviewed outcomes.

## Objectives

Define how review queues, confidence scores, Admin decisions, and regenerated evidence are interpreted.

## Estimated Time

Estimated Time: About 10 minutes to review the policy and examples.

## Acknowledgements

These rules describe the current local Analytics review policy; thresholds remain provisional until reviewed outcomes support calibration.
