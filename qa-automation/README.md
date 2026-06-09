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
node ./scripts/qa.mjs tests/platform/smoke
node ./scripts/qa.mjs tests/platform/regression
node ./scripts/qa.mjs tests/platform --tag smoke
node ./scripts/qa.mjs tests/platform --tag search
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
$env:QA_AUTH_TARGET_URL="https://example-private-page-url"
$env:QA_TRACE="on"
$env:QA_VIDEO="retain-on-failure"
node ./scripts/qa.mjs tests/platform/smoke
```
