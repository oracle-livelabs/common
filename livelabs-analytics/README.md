# LiveLabs Analytics

LiveLabs Analytics is a static governance dashboard for reviewing the Oracle LiveLabs workshop portfolio. It helps portfolio owners identify high-performing content, workshops and sprints that need review, and content that may be ready for retirement after replacement validation.

## How To Read The Dashboard

Start at the summary cards at the top of the page. They highlight the leading top performer, highest-risk item, and retire-now candidate across workshops and sprints.

Use the Contents section to move between the main views:

- `Top Performers` shows workshops and sprints with the strongest demand and freshness signals.
- `At-Risk Content` shows stale or low-demand content that should be reviewed before it moves closer to retirement.
- `Retire-Now Content` shows items with stronger evidence for retirement, usually after replacement evidence is available.
- `Replacement Suggestions` lists candidate successors and similarity evidence.
- `Disabled Content` keeps already disabled workshops and sprints visible for audit context.
- `Portfolio Stats` summarizes source coverage, scoring inputs, governance signals, and data-quality notes.

Most tables support sorting, filtering, and expandable rows. Open a row to review identifiers, source evidence, ownership fields, update dates, replacement details, and the reason the item appears in that view.

## Project Layout

- `index.html` is the published static dashboard page.
- `dashboard_payload.json`, `dashboard_tables.json`, `replacement_similarity.json`, `wms_canonical.json`, and `workshop_updates.json` are root dashboard payloads.
- `data/` contains split dashboard JSON files used for table-level payloads and review data.
- `assets/` contains fonts and images referenced by the page.
- `content/` contains supporting rendered content.
- `docs/` contains non-runtime reports and reference files.
- `dataset/` is local-only source data for analysis and is ignored by Git.
- `_local/` is for local-only QA notes and working files and is ignored by Git.

Keep runtime dashboard payloads in place unless a separate dependency audit proves they are unused.

When using the local `dataset/` folder, prefer the XLSX files or the `corrected-utf8` CSV exports for title-sensitive work. The raw 13.05.2026 sandbox CSV is retained only as source evidence and can contain damaged multilingual title text.

## Local Review

Serve the folder locally when checking the static site:

```powershell
cd path\to\livelabs-repos\common\livelabs-analytics
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

Before publishing changes, verify:

- the page title and main heading read `LiveLabs Analytics`;
- the dashboard returns HTTP 200 for `/`, `/index.html`, key JSON payloads, fonts, and images;
- root dashboard JSON and `data/*.json` parse successfully;
- `dataset/`, `_local/`, `test-results/`, and temporary probe files are not staged.
