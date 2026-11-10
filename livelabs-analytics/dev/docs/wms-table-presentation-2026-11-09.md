# WMS table presentation — November 9, 2026

Scope: reorder existing columns, expose Workshop/Sprint filters, and replace the
dashboard menu's dark/red selected state with a light teal theme. No content table
or column was added or deleted.

Existing content tables: Top Performers, P1 urgent action, At-risk, Retirement
review and protected Admin Portfolio inventory. Each keeps its original fields.
Content identifiers lead in WMS order: LiveLabs ID, WMS ID, Title, Council where
present, existing dates and ownership/contact fields, then Analytics-only fields.
Absent WMS fields are skipped rather than introduced. Last Update remains an
update field; it is not relabeled as WMS Completion Date.

The shared presentation function also reorders filter fields, remaps sorting and
filter indices, and keeps header/cell labels aligned. Rank updates target the
explicit rank column, so they cannot overwrite a leading ID. Existing generated
fragments use this same normalization after loading and QA enrichment.

All four public content tables expose All items / Workshops only / Sprints only
above their filter disclosure. The existing Admin content-type selector uses the
same choices. Values remain Workshop/Sprint internally, independent of labels.

Dashboard tabs use pale teal surfaces, dark text, a teal border/selection marker
and a blue keyboard focus outline. Mobile tooltips remain within their metric
card width. The selected tab's text contrast is tested against the 4.5:1 minimum.

Validation covers exact existing column sets/order, ID filter and numeric sort,
both content types, row preservation, filter-field order, Admin type counts and
mobile menu contrast/overflow. Screenshots are retained in
`output/screenshots/wms-table-order-20261109/`. Changes are local.

## Objectives

Document the WMS table ordering, visible type filters, and desktop and mobile presentation checks.

## Estimated Time

Estimated Time: About 5 minutes to review the table changes.

## Acknowledgements

The implementation and screenshots are local; no release or publication is claimed.
