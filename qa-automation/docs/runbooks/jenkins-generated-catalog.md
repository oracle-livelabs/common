# Jenkins Generated Catalog QA

This runbook describes how to run the LiveLabs generated catalog QA suite from Jenkins.

The Jenkins job should use:

```text
Script Path: qa-automation/Jenkinsfile
```

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
- Enough disk space for HTML reports, screenshots, traces, videos, and generated catalog JSON

If the agent does not already provide Playwright browsers, run with:

```text
INSTALL_PLAYWRIGHT_BROWSERS=true
```

## Credentials

For public-only runs, credentials are optional.

For authenticated/private items, create Jenkins string credentials and pass their credential IDs through these parameters:

```text
LIVELABS_USERNAME_CREDENTIAL_ID
LIVELABS_SECRET_CREDENTIAL_ID
AUTH_TARGET_URL
```

Jenkins maps those credentials to:

```text
QA_LIVELABS_USERNAME
QA_LIVELABS_PASSWORD
```

When `AUTH_TARGET_URL` and both credential IDs are present, Jenkins creates:

```text
qa-automation/.auth/livelabs-storage-state.json
```

The catalog indexer and generated Playwright tests then reuse that storage state. This lets the overnight crawler index catalog cards visible after sign-in, not only anonymous public cards.

Never commit `.env`, `.auth`, or storage-state files.

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

## Key Parameters

| Parameter | Use |
| --- | --- |
| `RUN_PROFILE` | `pr-slice`, `nightly-full`, or `manual-items`. |
| `BASE_URL` | Optional LiveLabs base URL override. |
| `BROWSER_CHANNEL` | Optional local browser channel, such as `chrome` or `msedge`. |
| `AUTH_TARGET_URL` | Private URL used to create storage state before crawling. |
| `LIVELABS_USERNAME_CREDENTIAL_ID` | Jenkins string credential ID for the LiveLabs test username. |
| `LIVELABS_SECRET_CREDENTIAL_ID` | Jenkins string credential ID for the LiveLabs test credential. |
| `CATALOG_MAX_PAGES` | Catalog crawl page override. Defaults to `1` for `pr-slice` and `250` for `manual-items`/`nightly-full`. |
| `CATALOG_MAX_ITEMS` | Small-run item cap. Defaults to `5` for `pr-slice` and no cap for `manual-items`/`nightly-full`. |
| `CATALOG_ITEM_IDS` | Comma-separated generated IDs/slugs for manual targeted runs. |
| `SHARD_TOTAL` | Number of parallel generated shards for `nightly-full`. |
| `CONTENT_LINK_LIMIT` | Visible links checked per generated content page; set `0` to check all. |

## Artifacts

Jenkins archives:

```text
qa-automation/artifacts/jenkins/**
qa-automation/tests/data/generated/*.json
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
