# LiveLabs QA Automation

Playwright and TypeScript test automation for the public LiveLabs platform.

The project focuses on high-signal browser checks for the learner experience: the home page, AI search entry point, workshop catalog, workshop landing pages, event-code entry point, responsive rendering, and selected regression behavior. Authenticated reservation checks are available as an opt-in lane when a Playwright storage-state file and target reservations URL are provided.

The framework stays intentionally lean: current tests drive browser behavior through Playwright specs, active page objects, small JSON data files, and one shared fixture. Future-only API helpers, unused page objects, and placeholder auth flows do not belong here until a real test needs them.

## Requirements

- Node.js 20 or newer
- npm
- Playwright browser dependencies
- Network access to the configured LiveLabs environment

## Local Setup

From the `qa-automation` folder:

```powershell
npm ci
npm run install:browsers
npm run doctor
npm run typecheck
npm run test:collect
```

If browser installation is blocked on your network, install dependencies with `npm ci`, then run with an existing local Chrome or Edge channel by setting `QA_BROWSER_CHANNEL` before the test command.

## Running Tests

Use the wrapper directly:

```powershell
node ./scripts/qa.mjs tests/platform/smoke
```

On Windows, you can also use:

```powershell
.\run.ps1 tests\platform\smoke
```

Common commands:

```powershell
npm run doctor
npm run typecheck
npm run test:collect
npm run catalog:index
npm run auth:storage -- --target-url "https://livelabs.oracle.com/..."
npm run test:generated
node ./scripts/qa.mjs tests/platform/smoke
node ./scripts/qa.mjs tests/platform/regression
node ./scripts/qa.mjs tests/platform --tag smoke
node ./scripts/qa.mjs tests/platform --tag search
node ./QA_GUI/scripts/published-workshop-qa.mjs --url "https://oracle-livelabs.github.io/<repo>/<path>/workshops/tenancy/index.html"
node ./scripts/qa.mjs tests/platform/smoke/public/homePage.spec.ts --headed
```

Useful options:

| Option | Use |
| --- | --- |
| `--collect-only` | List matching tests without running browsers |
| `--headed` | Watch the browser while the test runs |
| `--debug` | Open Playwright debug mode |
| `--ui` | Open Playwright UI mode |
| `--tag <tag>` | Filter by tags such as `smoke`, `regression`, `search`, or `auth` |
| `--browser <name>` | Run `chromium`, `firefox`, or `webkit` |
| `--base-url <url>` | Override the configured LiveLabs base URL for one run |
| `--search-term <term>` | Override the default shared search term fixture |
| `--retries <n>` | Retry failures |
| `--maxfail <n>` | Stop after a set number of failures |

## Test Lanes

Public smoke:

```powershell
node ./scripts/qa.mjs tests/platform/smoke
```

Public regression:

```powershell
node ./scripts/qa.mjs tests/platform/regression
```

Generated catalog rollout:

```powershell
npm run catalog:index
npm run test:generated
```

The generated rollout crawls the public catalog into
`tests/data/generated/livelabs_catalog_index.json` and writes a crawl summary to
`tests/data/generated/livelabs_catalog_index.summary.json`, then creates isolated
tests from that index. Each indexed workshop and LiveStack gets its own test
case, so one broken item does not hide or block the rest of the catalog.

What the generated rollout checks:

| Area | Checks |
| --- | --- |
| Catalog index | Verifies the generated index exists, has catalog items, uses unique item IDs, and does not duplicate URLs per item type. |
| Workshop overview | Opens each indexed workshop directly, signs in if Oracle Sign In appears, verifies the overview shell, and checks `Share`, `Start`, `About This Workshop`, `Outline`, and `Prerequisites`. |
| LiveStack overview | Opens each indexed LiveStack directly, signs in if required, verifies the LiveStack overview shell, and checks demo links, workshop/lab links, and asset/download/source actions. |
| LiveStack resources | For each indexed LiveStack, opens every listed demo/workshop resource, verifies the child workshop overview, validates preview instructions when offered, validates Run on your tenancy/environment instructions when offered, and clicks every asset/source/download action. |
| Preview instructions | Opens each indexed workshop, clicks `Start`, opens `Preview sandbox instructions` when offered, then validates the rendered instructions page. |
| Run on your tenancy instructions | Opens each indexed workshop, clicks `Start`, opens `Run on your environment` / `Run on your tenancy` when offered, then validates the rendered instructions page. This does not provision, reserve, or run anything in a tenancy. |
| Content quality | Checks relevance to the indexed title, obvious placeholder text, common misspellings, visible broken images, broken embedded content, and broken visible content links. |

The generated suite intentionally still does not execute Sandbox or tenancy
provisioning flows. It only validates instruction pages that are opened from
those options.

## Published Workshop QA Checker

Use this lane when you already have a published workshop URL and want the same
browser-side checker that appears after adding `qa=true` manually.

The visual app and its runner live in `QA_GUI`.

Visual app:

```powershell
npm run workshop:qa:app
```

Open `http://127.0.0.1:8787`, paste a workshop URL, and run the check from the
page. The History tab keeps the last 5 completed runs and the app restores the
active run after browser back/reload.

For a local Windows install, double-click `QA_GUI/Install Workshop QA.cmd`. It
creates a Desktop shortcut that starts the local server and opens the app.

To produce a shareable Windows installer, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\QA_GUI\package-windows-installer.ps1
```

The installer artifact is written to `artifacts/dist/Workshop-QA-Setup.exe`.

Command line:

```powershell
npm run workshop:qa -- "https://oracle-livelabs.github.io/oic/oic-gen3/cookbooks/erp-cloud/bulk-extract/workshops/tenancy/index.html"
```

The runner fetches the workshop `manifest.json`, opens each lab as
`?qa=true&lab=<lab-id>`, waits for the top-right QA report to settle, then writes:

- `QA_GUI/artifacts/runs/<run>/report.md` from the visual app
- `QA_GUI/artifacts/runs/<run>/report.json` from the visual app
- `QA_GUI/artifacts/published-workshop-qa/<run>/report.md` from the CLI
- `QA_GUI/artifacts/published-workshop-qa/<run>/report.json` from the CLI

Useful options:

```powershell
npm run workshop:qa -- "<workshop-url>" --lab cloud-login
npm run workshop:qa -- "<workshop-url>" --max-labs 3
npm run workshop:qa -- "<workshop-url>" --headed
npm run workshop:qa -- "<workshop-url>" --browser-channel msedge
npm run workshop:qa -- "<workshop-url>" --allow-issues
```

Quote URLs that contain `&` in PowerShell. By default, the command exits non-zero
when the checker finds issues or when a lab cannot load. Use `--allow-issues`
when you only want the report file and do not want findings to fail the command.

Jenkins generated catalog runs:

```text
Script Path: qa-automation/Jenkinsfile
Runbook: docs/runbooks/jenkins-generated-catalog.md
```

Use Jenkins for the scheduled overnight catalog sweep. The Jenkins pipeline runs
`tests/platform/generated`, not the homepage smoke lane, and supports a fast
`pr-slice` profile plus a sharded `nightly-full` profile.

To see the generated test names without opening a browser:

```powershell
node ./scripts/qa.mjs tests/platform/generated --collect-only
```

For a quick local slice:

```powershell
$env:QA_CATALOG_INDEX_LIMIT="5"
npm run test:generated
```

To target specific generated items, use their generated `id` or `slug`:

```powershell
$env:QA_CATALOG_INDEX_IDS="workshop-example-id,livestack-example-slug"
npm run test:generated
```

To split a full generated run across machines or CI jobs, shard the generated
index. The format is `current/total`:

```powershell
$env:QA_CATALOG_INDEX_SHARD="1/4"
npm run test:generated
```

The HTML report attaches `catalog-item.json` to each generated item test and
`livestack-resources.json` to each generated LiveStack resource drilldown test,
so a failure report shows the exact title, type, card URL, and resource/action
list that produced it.

The crawler retries transient navigation and card-rendering failures by default.
For a deeper crawl or a slower network:

```powershell
npm run catalog:index -- --max-pages 250 --retries 4 --retry-delay-ms 5000
```

For authenticated/private catalog entries, keep credentials only in `.env` or CI
secrets:

```powershell
# .env
QA_LIVELABS_USERNAME=
QA_LIVELABS_PASSWORD=
QA_AUTH_TARGET_URL=https://livelabs.oracle.com/...
QA_STORAGE_STATE=.auth/livelabs-storage-state.json
```

Create a reusable authenticated browser state, then run the generated suite:

```powershell
npm run auth:storage
npm run test:generated
```

When `QA_STORAGE_STATE` points to an existing storage-state file, both
`catalog:index` and `test:generated` reuse it. That lets scheduled runs crawl
and test catalog entries visible after sign-in.

Authenticated checks:

```powershell
$env:QA_STORAGE_STATE="path\to\storage-state.json"
$env:QA_RESERVATIONS_URL="https://example-reservations-url"
node ./scripts/qa.mjs tests/platform/auth --tag auth
```

Private authenticated page mockup:

```powershell
$env:QA_STORAGE_STATE="playwright\.auth\livelabs-auth.json"
$env:QA_AUTH_TARGET_URL="https://livelabs.oracle.com/ords/r/dbpm/<app-alias>/home"
$env:QA_AUTH_READY_TEXT="<text visible only after auth>"
node ./scripts/qa.mjs tests/platform/auth/privatePageAccess.spec.ts --tag auth
```

If the application team provides a test-only session bootstrap endpoint, set `QA_AUTH_BOOTSTRAP_URL` and keep the short-lived `QA_AUTH_BOOTSTRAP_TOKEN` in a local or CI secret. See `docs/runbooks/authenticated-page-access.md` for the access request checklist and the full variable contract.

Do not commit storage-state files, credentials, screenshots with private data, or environment-specific secrets.

## Creating Tests

1. Add the spec under the matching lane: `tests/platform/smoke` for fast confidence checks or `tests/platform/regression` for focused edge cases.
2. Put selectors and navigation behavior in page objects under `pages/platform`.
3. Put shared data in `tests/data` and shared helpers in `tests/support` only when more than one spec needs them.
4. Import the canonical fixture from `tests/support/test.ts`.
5. Add useful tags on `test.describe`.
6. Use `test.step` for important user actions so the HTML report is readable.
7. Run collection, typecheck, then the narrow spec path before running a wider lane.

Keep new code small: extend an existing page object or fixture only when more than one active spec needs the behavior.

Minimal pattern:

```ts
import { expect, test } from "../../../support/test.js";

const TAGS = ["@smoke", "@platform", "@home", "@ui"];

test.describe("LiveLabs home page", { tag: TAGS }, () => {
  test("shows the public entry point", async ({ environmentConfig, homePage }) => {
    await test.step("Open the home page", async () => {
      await homePage.goto(environmentConfig.base_url);
    });

    await test.step("Verify the entry point", async () => {
      await homePage.assertLoaded();
      await expect(homePage.searchInput).toBeEditable();
    });
  });
});
```

Before committing a new test:

```powershell
npm run typecheck
npm run test:collect
node ./scripts/qa.mjs tests/platform/smoke/public/newSpec.spec.ts
```

## Reports And Debugging

Artifacts are written under `artifacts` and are ignored by Git.

Open the latest HTML report:

```powershell
node ./scripts/qa.mjs report
```

Open a lane report:

```powershell
node ./scripts/qa.mjs report smoke
node ./scripts/qa.mjs report regression
```

Open the newest trace:

```powershell
node ./scripts/qa.mjs trace
```

The shared fixture attaches run context, browser console messages, page errors, request failures, response errors, page state, and DOM snapshots when useful. Start with the HTML report, then open the trace if the failure needs browser timeline detail.

## Configuration

Default runtime values live in `config/project_settings.json`. The default environment targets the public LiveLabs production URL and runs Chromium in serial mode.

Common overrides:

```powershell
$env:QA_BASE_URL="https://example-base-url"
$env:QA_BROWSER_CHANNEL="msedge"
$env:QA_SEARCH_TERM="OCI"
$env:QA_CATALOG_INDEX_FILE="tests\data\generated\livelabs_catalog_index.json"
$env:QA_CATALOG_INDEX_LIMIT="25"
$env:QA_CATALOG_INDEX_SHARD="1/4"
$env:QA_AUTH_TARGET_URL="https://example-private-page-url"
$env:QA_TRACE="on"
node ./scripts/qa.mjs tests/platform/smoke
```
