# Current assignments table

Replaced Dashboard management's assignment cards with a full-width table. The tag definition and new assignment forms remain above it.

- Columns follow the shared WMS order: LiveLabs ID, WMS ID, Title, Council, Author / owner, then Type, Tags, Match rule, and Added.
- Search, Workshop/Sprint/unknown-type filters, LiveLabs/WMS ID filters, council/tag/rule filters, sortable headers, 10/25/50/100 rows per page, previous/next controls, counts, reset, and filtered CSV export.
- Clicking a row or activating its ID button opens item information, source fields, review/provenance, tag descriptions, and the existing item-search link. Admins can edit tags, save/cancel, or remove the assignment with an inline confirmation.
- One row represents one item/rule pair. Multiple matching rules remain separate. Family rules show all affected items, and edits retain their original scope. Unmatched and disabled rules remain visible.
- Failed saves retain drafts and restore the saved tags. Tag mutations block overlapping edits while the complete rule set is being saved. Removal preserves inventory items and tag definitions.
- Table content scrolls horizontally on narrow screens; expanded details and actions fit the available width. Keyboard controls, focus indicators, sort state, disclosure state, and live result counts are included.
- CSV exports include all filtered rows in the selected order, with UTF-8 and spreadsheet-formula escaping.

## Validation

- Full Playwright suite: **16 passed**, including Admin navigation, table behavior, saved-state read-back, family rules, mobile layout, keyboard expansion, removal, failed-save recovery, and CSV export.
- Dashboard validator: **80 passed, 0 warnings, 0 failures**.
- JavaScript syntax and scoped diff whitespace checks passed.
- Desktop and mobile screenshots inspected under `output/screenshots/assignment-table-20261109/`. These use synthetic assignment records and a disposable authenticated Admin service; tests do not modify the user's saved assignments.
- Local implementation only. No release package or Object Storage publication was performed.

## Objectives

Describe the current assignments table changes and their local verification.

## Estimated Time

Estimated Time: About 5 minutes to review this implementation note.

## Acknowledgements

The screenshots use synthetic assignment records and a disposable authenticated Admin service; tests do not change saved assignments.
