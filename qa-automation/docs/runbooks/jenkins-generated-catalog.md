# Jenkins Generated Catalog QA

This runbook describes how to run the LiveLabs generated catalog QA suite from Jenkins.

The Jenkins job should use:

```text
Script Path: qa-automation/Jenkinsfile
```

For a permanent private VM, use the prepared appliance in
[`deploy/vm`](../../deploy/vm/README.md). It creates one operator job for the
nightly or targeted overall regression, including PAR checks.

## Goal

Use Jenkins for repeatable generated catalog runs:

- PR or manual smoke: crawl a small catalog slice and run generated tests against that slice.
- Overnight: crawl the catalog and run every generated and PAR check in one report.
- Manual investigation: target specific generated catalog IDs or slugs.

The Jenkins job intentionally runs `tests/platform/generated` together with `tests/platform/par/catalogParLinks.spec.ts`. It does not run the homepage smoke lane on every catalog sweep because the overnight goal is workshop, LiveStack, instruction, resource, PAR, link, image, embed, and asset coverage.

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

Then it runs all catalog checks in one report:

```text
node ./scripts/qa.mjs tests/platform/generated tests/platform/par/catalogParLinks.spec.ts
```

### manual-items

Use this profile for targeted investigation. Set:

```text
CATALOG_ITEM_IDS=generated-id-or-slug,another-id-or-slug
```

The run still crawls the catalog broadly by default, but generated tests only
execute matching indexed items. Override `CATALOG_MAX_PAGES` or
`CATALOG_MAX_ITEMS` only when you intentionally want a smaller manual crawl.

## Key Parameters

| Parameter | Use |
| --- | --- |
| RUN_PROFILE | pr-slice, nightly-full, or manual-items. All include PAR checks. |
| `BASE_URL` | Optional LiveLabs base URL override. |
| `BROWSER_CHANNEL` | Optional local browser channel, such as `chrome` or `msedge`. |
| `AUTH_TARGET_URL` | Private URL used to create storage state before crawling. |
| `LIVELABS_USERNAME_CREDENTIAL_ID` | Jenkins string credential ID for the LiveLabs test username. |
| `LIVELABS_SECRET_CREDENTIAL_ID` | Jenkins string credential ID for the LiveLabs test credential. |
| CATALOG_MAX_PAGES | Catalog crawl page override. Defaults to 1 for pr-slice/manual-items and 250 for nightly-full. |
| CATALOG_MAX_ITEMS | Small-run item cap. Defaults to 5 for pr-slice and no cap for the other profiles. |
| `CATALOG_ITEM_IDS` | Comma-separated generated IDs/slugs for manual targeted runs. |
| `TEST_WORKERS` | Playwright workers in the single combined report run. |
| `CONTENT_LINK_LIMIT` | Visible links checked per generated content page; set `0` to check all. |
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
6. Keep the full run as one report and tune `TEST_WORKERS` only after checking VM utilization.

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
