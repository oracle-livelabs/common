# LiveLabs Analytics

LiveLabs Analytics is a static governance dashboard for reviewing the Oracle LiveLabs workshop portfolio. It helps portfolio owners identify high-performing content, workshops and sprints that need review, and content that may be ready for retirement after replacement validation.

This checked-in GitHub Pages bundle is static only. Keep OCI VM runtime files such as API code, wallet files, Nginx configuration, systemd units, and protected environment files in the VM deployment workspace instead of this published directory.

## How To Read The Dashboard

Start at the summary cards at the top of the page. They highlight the leading top performer, highest-risk item, and retire-now candidate across workshops and sprints.

Use the Contents section to move between the main views:

- `Top Performers` shows workshops and sprints with the strongest demand and freshness signals.
- `At-Risk Content` shows stale or low-demand content that should be reviewed before it moves closer to retirement.
- `Retire-Now Content` shows items with stronger evidence for retirement, usually after replacement evidence is available.
- `Replacement Suggestions` lists candidate successors and similarity evidence.
- `Disabled Content` keeps already disabled workshops and sprints visible for audit context.
- `Portfolio Stats` summarizes source coverage, scoring inputs, governance signals, and data-quality notes.


## Search, Sorting, And Filtering

Use the sidebar search to open a focused workshop or sprint detail view, then use `Back to Dashboard` to return to the main dashboard.

Most tables support sorting, filtering, pagination, and expandable rows. Filters always apply to the full table before pagination. Category filters use exact category selections so broad labels such as `Database` do not also match `AI/ML Database`. Pagination includes row-range jumps for `15 - 20` through `120 - 140`.

The active improvement requirements live in `docs/requirements/livelabs-analytics-improvements-2026-05-15.md`.
