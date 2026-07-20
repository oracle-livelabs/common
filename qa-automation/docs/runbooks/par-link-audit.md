# PAR Link Audit

The PAR audit checks PAR links discovered automatically from the LiveLabs catalog. It does not require a separate list of links.

## What It Does

1. Crawls every available LiveLabs catalog page, up to the configured page limit.
2. Collects each workshop and LiveStack card.
3. Opens the card's source manifest and instruction files.
4. Finds OCI Object Storage PAR links in those sources.
5. Checks each link with a safe HEAD request and a small GET range fallback.
6. Retries temporary failures before deciding whether a link is broken.
7. Records the exact catalog item, lab, task, Markdown file, line, bucket, and object when available.

The audit does not run overview, image, embed, or general link tests. Those belong to the overall regression job.

## Result Types

| Result | Meaning | Action |
| --- | --- | --- |
| Working | OCI returned a successful response. | None. |
| Broken | OCI returned a confirmed unusable response such as 401, 403, 404, or 410. | Replace the PAR link in the recorded workshop source. |
| Recheck | The request remained inconclusive after retries. | Retry before changing content. |
| Scan incomplete | A manifest or instruction source could not be read. | Fix access or the missing source, then rerun. |

## Run From The VM UI

Open the private Jenkins page and select **LiveLabs PAR audit**.

For a complete crawl:

```text
CATALOG_MAX_PAGES = 250
CATALOG_MAX_ITEMS = leave blank
```

Then select **Build**. Leaving the item limit blank tells Jenkins to scan every card found by the crawler.

The VM schedules this job weekly. The internal engine profile is still named `par-audit` for compatibility, but the VM schedule is weekly.

## Run Locally

From `qa-automation`:

```powershell
npm run catalog:index -- --max-pages 250
$env:QA_WORKERS="2"
$env:QA_PAR_DISCOVERY_CONCURRENCY="3"
$env:QA_PAR_SOURCE_TIMEOUT_MS="45000"
node .\scripts\qa.mjs tests\platform\par\catalogParLinks.spec.ts
```

Use `--max-items 5` during a small validation run. Remove that option for the full catalog.

## Reports

The VM publishes the PAR report under:

```text
/par/
```

Local runs write:

```text
reports/latest/par-links.html
reports/latest/par-catalog-not-working.csv
reports/latest/par-unverified.csv
reports/latest/par-scan-incomplete.csv
reports/latest/par-links-safe.json
reports/latest/results.csv
```

Historical runs remain under:

```text
reports/runs/<run-id>/
```

Start with `par-catalog-not-working.csv`. It contains the confirmed broken links and the source locations that need repair.

## Privacy

The PAR token is the credential. Reports mask the token, authorization headers, cookies, and APEX session values. They retain only the storage location and source information needed to fix the workshop.

Do not copy raw PAR URLs into Git, Jenkins descriptions, tickets, or chat. The audit discovers them during the run and writes only masked results.
