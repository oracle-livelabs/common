# Jenkins Generated Catalog QA

This runbook describes how to run the LiveLabs generated catalog QA suite from Jenkins.

The Jenkins job should use:

```text
Script Path: qa-automation/Jenkinsfile
```

For a permanent private VM, use the prepared two-job appliance in
[`deploy/vm`](../../deploy/vm/README.md). It creates separate operator jobs for
the weekly PAR audit and nightly/targeted overall regression while reusing this
same Jenkinsfile as the execution engine.

## Goal

Use Jenkins for repeatable generated catalog runs:

- PR or manual smoke: crawl a small catalog slice and run generated tests against that slice.
- Overnight: crawl the catalog and run generated tests in parallel shards.
- Manual investigation: target specific generated catalog IDs or slugs.

The Jenkins job intentionally runs `tests/platform/generated`. It does not run the homepage smoke lane on every catalog sweep because the overnight goal is workshop, LiveStack, instruction, resource, link, image, embed, and asset coverage.

## Jenkins Agent Requirements

The agent needs:

- Node.js 20 or newer
- npm
- Network access to the configured LiveLabs environment
- A Playwright-supported browser
- A Linux-like Jenkins shell step, or an agent/container where `sh` is available
- Enough disk space for HTML reports, screenshots, traces, and generated catalog JSON

If the agent does not already provide Playwright browsers, run with:

```text
INSTALL_PLAYWRIGHT_BROWSERS=true
```

## Private-content access

Public catalog runs require no LiveLabs credential.

For approved private-content checks, the permanent QA service loads the test identity from OCI Vault through its instance principal and maps it into Jenkins without exposing the value to operators. Build users must never paste usernames, passwords, tokens, or secret OCIDs into Jenkins parameters or console output.

The resulting Playwright storage state stays inside the ignored automation workspace and is never published with reports.
## Profiles

### pr-slice

Default profile. Intended for a fast Jenkins proof and PR validation.

It runs:

```text
npm ci
npm run typecheck
npm run test:collect
npm run catalog:index -- --max-pages 1 --max-items 5
node ./scripts/qa.mjs tests/platform/generated
```

### nightly-full

Intended for the overnight catalog run.

It runs:

```text
npm ci
npm run typecheck
npm run test:collect
npm run catalog:index -- --max-pages 250
```

Then it runs generated tests in shards:

```text
QA_CATALOG_INDEX_SHARD=1/4
QA_CATALOG_INDEX_SHARD=2/4
QA_CATALOG_INDEX_SHARD=3/4
QA_CATALOG_INDEX_SHARD=4/4
```

Use `SHARD_TOTAL` to change the number of shards.

### manual-items

Use this profile for targeted investigation. Set:

```text
CATALOG_ITEM_IDS=generated-id-or-slug,another-id-or-slug
```

The run still crawls the catalog broadly by default, but generated tests only
execute matching indexed items. Override `CATALOG_MAX_PAGES` or
`CATALOG_MAX_ITEMS` only when you intentionally want a smaller manual crawl.

### par-audit

Runs only full-catalog PAR discovery. Normal generated regression specs are skipped. It uses 250 catalog pages and no item cap by default, scans manifest-listed workshop sources concurrently, and reports exact Markdown locations for findings. No manually maintained PAR list is required.

See [PAR Link Audit](par-link-audit.md) for scheduling, privacy, and report details.

## Key Parameters

| Parameter | Use |
| --- | --- |
| RUN_PROFILE | pr-slice, nightly-full, manual-items, or par-audit. |
| `BASE_URL` | Optional LiveLabs base URL override. |
| `BROWSER_CHANNEL` | Optional local browser channel, such as `chrome` or `msedge`. |
| `AUTH_TARGET_URL` | Private URL used to create storage state before crawling. |
| `LIVELABS_USERNAME_CREDENTIAL_ID` | Jenkins string credential ID for the LiveLabs test username. |
| `LIVELABS_SECRET_CREDENTIAL_ID` | Jenkins string credential ID for the LiveLabs test credential. |
| CATALOG_MAX_PAGES | Catalog crawl page override. Defaults to 1 for pr-slice/manual-items and 250 for nightly-full/par-audit. |
| CATALOG_MAX_ITEMS | Small-run item cap. Defaults to 5 for pr-slice and no cap for the other profiles. |
| `CATALOG_ITEM_IDS` | Comma-separated generated IDs/slugs for manual targeted runs. |
| `SHARD_TOTAL` | Number of parallel generated shards for `nightly-full`. |
| `TEST_WORKERS` | Playwright workers in each generated run. The VM package uses one shard and five workers so it produces one complete report. |
| `CONTENT_LINK_LIMIT` | Visible links checked per generated content page; set `0` to check all. |
| PAR_WORKERS | Parallel catalog items for par-audit. The reliable default is 2. |
| PAR_DISCOVERY_CONCURRENCY | Concurrent manifest-listed Markdown files fetched inside each PAR item. The reliable default is 3. |
| PAR_SOURCE_TIMEOUT_MS | Timeout for each workshop manifest or Markdown source request. The default is 45000 ms. |
| PAR_RETRIES | Retry count for inconclusive PAR probes. |
| PAR_TIMEOUT_MS | Timeout for each PAR probe request. |
| PAR_CHECK_CONCURRENCY | Concurrent PAR HTTP probes inside each catalog item test. |

## Artifacts

Jenkins archives:

```text
qa-automation/artifacts/jenkins/**
qa-automation/tests/data/generated/*.json
qa-automation/reports/**
```

Important outputs:

```text
artifacts/jenkins/<run-name>/html-report/index.html
artifacts/jenkins/<run-name>/junit.xml
artifacts/jenkins/<run-name>/results.json
tests/data/generated/livelabs_catalog_index.json
tests/data/generated/livelabs_catalog_index.summary.json
```

Use the HTML reports and traces to show developers the exact failing page, image, link, embedded content, asset action, or instruction page.

## Suggested Rollout

1. Create the Jenkins job with `Script Path: qa-automation/Jenkinsfile`.
2. Run `RUN_PROFILE=pr-slice` with no credentials.
3. Add credentials and `AUTH_TARGET_URL`; rerun `pr-slice`.
4. Run `manual-items` against one known workshop and one known LiveStack.
5. Schedule `nightly-full` after the small runs are stable.
6. Tune `SHARD_TOTAL` based on runtime. Start with `4`, then increase if the overnight run is too slow.

## Failure Handling

Treat generated failures as real signals unless the failure is clearly infrastructure-related.

Common categories:

- page does not load or routes incorrectly
- overview content is missing
- instruction preview does not open
- visible image is broken
- embedded content is blank or broken
- visible link returns a broken status
- LiveStack asset action does not open, download, or navigate
- Oracle Sign In cannot complete with the configured Jenkins credentials

Do not hide failures by skipping tests. If a failure is accepted temporarily, track it outside the test run with the matching Jenkins build link and generated catalog item ID.
