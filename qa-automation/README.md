# LiveLabs QA Automation JS

Playwright and TypeScript automation for the public LiveLabs platform flows that are currently covered in this project.

The framework is intentionally small and direct:

- native `@playwright/test`
- direct specs under `tests/platform/...`
- shared fixtures under `tests/support/...`
- page objects under `pages/...`
- one simple terminal entrypoint: `run ...`

This repository does **not** use BDD feature execution, Mocha, Chai, Cucumber, or any extra runner layers.

## Scope

The current scope is the anonymous, public LiveLabs platform experience before a learner enters actual workshop content.

Covered now:

- home page loads
- home page search returns workshop results
- direct catalog search links preserve the requested search
- catalog search can be cleared back to browse results
- search results open a workshop landing page
- workshop landing pages expose launch options
- search edge cases keep the expected behavior

Not in scope right now:

- authenticated flows
- reservations
- event code flows
- content rendering flows after entering a workshop
- validation-only lanes
- executable feature files

If those areas are added later, they should be added intentionally, not as placeholder scaffolding.

## Design Principles

- Prefer direct Playwright specs over abstraction layers that hide the runtime.
- Keep selectors and browser behavior in page objects, not in specs.
- Keep shared runtime state in fixtures only when multiple specs actually need it.
- Keep dependencies minimal.
- Do not add third-party HTTP client libraries such as `axios`.
- If API support is needed later, prefer built-in `fetch` or Playwright request APIs.
- Keep the command surface simple enough that a user can run tests from the VS Code terminal without remembering PowerShell script syntax.

## Built-In Tooling

The current Playwright-first architecture already gives you most of the tooling teams usually try to bolt on with extra libraries:

- native test runner, fixtures, projects, tags, retries, and web-first assertions
- HTML report for humans
- JUnit XML and JSON reports for machines
- retained traces and videos on failure
- automatic screenshots on failure
- Playwright UI mode, debug mode, trace viewer, and codegen
- typed fixtures and page objects instead of loosely structured helper files

The framework now adds a thin project layer on top of that:

- automatic per-test `qa-run-context` attachment
- automatic console, page-error, failed-request, and HTTP error logging
- automatic failure page-state capture
- automatic DOM snapshot attachment on failure
- simple `run report`, `run trace`, and `run codegen` commands

Why this is better than adding Mocha and Chai here:

- Playwright Test already covers the runner, fixtures, assertions, projects, retries, artifacts, and reports in one integrated tool
- Mocha and Chai would mostly duplicate runner and assertion responsibilities, but they would not replace Playwright traces, videos, screenshots, or browser-aware reporting
- fewer layers means fewer mismatches between the command line, the report output, and the browser runtime

## Tooling Matrix

This is the shortest map of what tool is responsible for what in the current framework.

| Capability | Primary Tool | Current Project Usage | Typical Entry Point |
| --- | --- | --- | --- |
| Test execution | `@playwright/test` plus `run` wrapper | runs specs, projects, workers, retries, tags, and path selection | `run tests\platform\smoke` |
| Assertions | Playwright `expect` | web-first UI assertions and page state checks | inside specs and page objects |
| Fixtures | Playwright fixtures | shared `test` object, page objects, runtime values, diagnostics wiring | `tests/support/test.ts` |
| Human-readable reporting | Playwright HTML reporter | clickable report with steps, attachments, and failures | `run report` |
| Machine-readable reporting | Playwright JUnit and JSON reporters | CI integration, historical parsing, and post-run analysis | generated automatically under `artifacts/...` |
| Browser diagnostics | Playwright trace, video, screenshot, and error context | retained failure evidence for debugging UI issues | `run trace` |
| Interactive debugging | Playwright UI mode and debug mode | step-through local debugging and locator inspection | `run tests\platform --ui` |
| Test generation | Playwright codegen | generate starter Playwright actions/selectors for new flows | `run codegen /home` |
| Runtime observability | project diagnostics fixture | per-test run context, console logs, page errors, request failures, DOM snapshots | automatic via `tests/support/diagnostics.ts` |
| Configuration and commands | project wrapper plus typed config helpers | stable `run ...` UX, lane-aware artifact paths, validated environments | `scripts/qa.mjs` and `config/projectConfig.ts` |
| API or HTTP support | built-in `fetch` or Playwright request APIs | reserved for future use without extra dependencies | use built-ins only |
| Mocha / Chai | intentionally not used | would duplicate runner and assertion concerns already covered by Playwright Test | not part of this architecture |

Practical takeaway:

- if you need to run tests, filter tests, retry tests, or switch browsers, use `run ...`
- if you need to debug a browser failure, open the HTML report first, then the trace
- if you need new scaffolding for a UI flow, use `run codegen ...`
- if you think you need Mocha, Chai, or `axios`, stop and check whether Playwright or built-in Node already covers it first

## Requirements

- Windows with PowerShell or Command Prompt
- Node.js `>= 20`
- npm available on `PATH`
- VS Code workspace opened at this project root if you want the bare `run` command

## Why Bare `run` Works

The workspace includes `.vscode/settings.json` with a terminal `Path` override that prepends the project root to the VS Code terminal session.

That means:

- `run doctor`
- `run tests\platform\smoke`
- `run install`

work directly in a newly opened VS Code terminal for this workspace.

Important:

- restart the terminal once after opening the workspace, so the `Path` change is applied
- if you run from an external terminal that does not inherit the workspace `Path`, use `.\run.ps1 ...`, `run.cmd ...`, or `node scripts/qa.mjs ...` as fallback entrypoints

## Repository Layout

```text
QA_Automation_JS/
|-- .vscode/
|   `-- settings.json
|-- config/
|   |-- project_settings.json
|   `-- projectConfig.ts
|-- docs/
|   `-- runbooks/
|       |-- how-to-add-a-new-test.md
|       `-- how-to-debug-a-failing-run.md
|-- pages/
|   |-- basePage.ts
|   `-- platform/
|       |-- auth/
|       |   `-- signInPage.ts
|       |-- components/
|       |   |-- footerRegion.ts
|       |   `-- headerRegion.ts
|       |-- events/
|       |   `-- eventCodeRequestPage.ts
|       |-- homePage.ts
|       |-- reservations/
|       |   `-- reservationsPage.ts
|       |-- workshopCardsPage.ts
|       |-- workshopLaunchOptionsDialog.ts
|       `-- workshopLandingPage.ts
|-- scripts/
|   `-- qa.mjs
|-- tests/
|   |-- data/
|   |   `-- search_edge_cases.json
|   |-- platform/
|   |   |-- regression/
|   |   |   `-- public/
|   |   |       `-- searchEdgeCases.spec.ts
|   |   `-- smoke/
|   |       `-- public/
|   |           |-- homePage.spec.ts
|   |           |-- homeSearch.spec.ts
|   |           `-- homeSearchOpenWorkshopLanding.spec.ts
|   `-- support/
|       |-- apiContext.ts
|       |-- authRuntime.ts
|       |-- diagnostics.ts
|       |-- platformSmokeData.ts
|       |-- searchCases.ts
|       |-- searchHelpers.ts
|       `-- test.ts
|-- package.json
|-- playwright.config.ts
|-- run.cmd
|-- run.ps1
`-- tsconfig.json
```

## High-Level Execution Flow

When you run a test, the framework works in this order:

1. `run` resolves to `run.ps1` in PowerShell or `run.cmd` in Command Prompt.
2. The wrapper resolves `node` and forwards all arguments to `scripts/qa.mjs`.
3. `scripts/qa.mjs` parses the subcommand and CLI flags.
4. The runner loads defaults from `config/project_settings.json`.
5. The runner sets environment variables such as `QA_ENVIRONMENT`, `QA_TRACE`, and `QA_OUTPUT_DIR`.
6. Playwright loads `playwright.config.ts`.
7. Specs import the canonical shared fixture from `tests/support/test.ts`.
8. The fixture layer creates the current page object instances and the automatic diagnostics session.
9. Specs call page object methods and assertions.
10. Playwright and the diagnostics layer attach reports, logs, traces, videos, and failure context.
11. Artifacts are written under `artifacts/...` unless a custom output path is provided.

## Main Runtime Files

### `run.ps1`

- the PowerShell entrypoint
- resolves `node`
- forwards arguments to `scripts/qa.mjs`

### `run.cmd`

- the Command Prompt entrypoint
- resolves `node`
- forwards arguments to `scripts/qa.mjs`

### `scripts/qa.mjs`

- the canonical local runner
- supports the `run`, `doctor`, `install`, `playwright`, `report`, `trace`, and `codegen` subcommands
- normalizes common CLI options into Playwright-compatible arguments
- computes artifact paths
- prints path resolution during `--collect-only`
- supports passthrough arguments after `--`

### `playwright.config.ts`

- sets the Playwright test root to `./tests`
- only runs files that match `*.spec.ts`
- ignores `tests/support/**`
- configures the reporters
- applies environment-driven runtime values such as base URL, trace, video, screenshot, retries, workers, and headed mode
- writes HTML, JUnit, and JSON reports when enabled
- declares three browser projects: `chromium`, `firefox`, and `webkit`

### `config/project_settings.json`

- stores default environment names and URLs
- stores the default browser list
- stores the default worker and retry settings
- stores trace, video, screenshot, search-term, artifact, JUnit, and JSON defaults
- stores diagnostics defaults such as console logging and DOM snapshot capture

### `config/projectConfig.ts`

- typed helper layer around the JSON settings
- resolves environments safely
- resolves the default search term
- resolves the base URL
- parses boolean and integer runtime flags consistently
- auto-detects a local Chromium channel on Windows

## Current Test Architecture

### Specs

Specs live under `tests/platform/...` and should remain the executable source of truth.

Current spec files:

- `tests/platform/smoke/public/homePage.spec.ts`
- `tests/platform/smoke/public/homeSearch.spec.ts`
- `tests/platform/smoke/public/homeSearchOpenWorkshopLanding.spec.ts`
- `tests/platform/regression/public/searchEdgeCases.spec.ts`

### Shared Fixture Layer

`tests/support/test.ts` exports the canonical `test` object for the whole suite.

Available worker-scoped fixtures:

- `targetEnvironment`
- `environmentConfig`
- `apiBaseUrl`
- `authRuntime`
- `livelabsSearchTerm`

Available test-scoped fixtures:

- `homePage`
- `signInPage`
- `headerRegion`
- `footerRegion`
- `eventCodeRequestPage`
- `workshopCardsPage`
- `workshopLandingPage`
- `workshopLaunchOptionsDialog`
- `reservationsPage`
- `qaArtifacts`

Use this file when you need to:

- expose a new shared page object to many specs
- centralize a new worker-scoped runtime value
- keep the spec import surface consistent

### Automatic Diagnostics Layer

`tests/support/diagnostics.ts` is wired automatically through the shared fixture.

Current behavior:

- attaches `qa-run-context` JSON to every executed test
- captures browser console messages when present
- captures page errors when present
- captures failed network requests when present
- captures HTTP responses at or above the configured status threshold
- captures page URL/title state on failure
- captures a DOM snapshot on failure
- exposes `qaArtifacts.captureCheckpoint(...)` for optional named screenshots in future tests

This means maintainers can keep specs focused on behavior while the framework keeps collecting the debug surface in the background.

### Page Objects

Current active page objects:

- `pages/basePage.ts`
- `pages/platform/components/headerRegion.ts`
- `pages/platform/components/footerRegion.ts`
- `pages/platform/auth/signInPage.ts`
- `pages/platform/homePage.ts`
- `pages/platform/events/eventCodeRequestPage.ts`
- `pages/platform/reservations/reservationsPage.ts`
- `pages/platform/workshopCardsPage.ts`
- `pages/platform/workshopLaunchOptionsDialog.ts`
- `pages/platform/workshopLandingPage.ts`

`BasePage` is the shared behavior layer. It provides:

- wait helpers
- safe click and fill helpers
- page-title assertions
- URL path waits
- body text assertions
- cookie-banner dismissal

The platform page objects then add:

- selectors
- platform-specific helper methods
- platform-specific assertions

### Support Utilities

`tests/support/searchHelpers.ts`:

- converts migration-friendly tokens such as `configured` or `default` into the configured search term

`tests/support/searchCases.ts`:

- loads JSON-backed regression data from `tests/data/search_edge_cases.json`
- gives typed lookup helpers

`tests/support/platformSmokeData.ts`:

- loads JSON-backed smoke inputs from `tests/data/platform_smoke_targets.json`
- keeps stable public smoke targets out of the specs

`tests/support/authRuntime.ts`:

- resolves future auth runtime inputs such as storage state or credentials
- lets authenticated coverage fail fast later with a single shared contract

`tests/support/apiContext.ts`:

- resolves a future API base URL and auth headers from environment variables
- creates a Playwright request context without adding extra HTTP dependencies

This is the preferred pattern when you want data-driven tests without hard-coding lots of literal values inside the spec.

## Current Tags

Tags are defined on `test.describe(..., { tag: [...] })` blocks inside the specs.

Current tags in the repository:

| Tag | Meaning | Current Usage |
| --- | --- | --- |
| `@platform` | marks platform lane tests | all current specs |
| `@smoke` | marks high-signal smoke coverage | all smoke specs |
| `@regression` | marks regression coverage | search edge-case spec |
| `@home` | marks home-page focused coverage | home page smoke spec |
| `@navigation` | marks navigation-style platform checks | home page smoke spec |
| `@search` | marks search-related flows | search smoke and regression specs |
| `@catalog` | marks workshop-card / result-list behavior | search smoke and regression specs |
| `@ui` | marks browser UI coverage | all current specs |

How tag filtering works:

- pass `--tag smoke`
- pass `--tag @smoke`
- pass comma-separated tags such as `--tag smoke,search`
- pass repeated tags such as `--tag smoke --tag search`

Important:

- multiple tags are combined as **AND**, not OR
- `--tag smoke --tag search` only runs tests that have both tags

Examples:

```powershell
run tests --tag smoke
run tests --tag search
run tests --tag smoke,search
run tests --tag platform --tag regression
```

## User-Facing Commands

The user-facing command is `run`.

There are four practical command shapes:

### 1. Run Tests

If the first argument is a test path or an option, the runner treats the command as a test run.

Examples:

```powershell
run
run tests
run tests\platform
run tests\platform\smoke
run tests\platform\regression
run tests\platform\smoke\public\homePage.spec.ts
run tests\platform\smoke\public
```

Behavior:

- `run` with no path defaults to `tests`
- paths should normally be real files or folders under `tests`
- `.feature` files are rejected on purpose

### 2. Doctor

Shows the resolved runtime context.

```powershell
run doctor
```

Useful when you want to confirm:

- Node version
- npm version
- project root
- active config file
- default environment
- default browser list
- default worker mode
- artifact defaults

### 3. Install

Installs npm dependencies and, by default, also asks Playwright to install managed browsers.

```powershell
run install
run install --skip-browsers
run install --upgrade
```

Use cases:

- `run install`: normal setup
- `run install --skip-browsers`: install dependencies only
- `run install --upgrade`: update packages after install

If your network blocks Playwright browser downloads, `run install` can fail during the browser step. In that case:

- use `run install --skip-browsers`
- run Chromium through the local Edge/Chrome channel fallback

### 4. Report Viewer

Open the latest HTML report or a specific lane.

```powershell
run report
run report smoke
run report regression
run report artifacts\platform\smoke\html-report
```

### 5. Trace Viewer

Open the newest trace or a specific trace file.

```powershell
run trace
run trace artifacts\platform\smoke\test-results
run trace artifacts\platform\smoke\test-results\some-test\trace.zip
```

### 6. Codegen

Launch Playwright code generation without leaving the simple project wrapper.

```powershell
run codegen
run codegen /home
run codegen https://livelabs.oracle.com/ords/r/dbpm/livelabs/home
run codegen /home --browser firefox
```

### 7. Raw Playwright Passthrough

Use the `playwright` subcommand when you want raw CLI access.

```powershell
run playwright show-report
run playwright show-report artifacts\platform\smoke\html-report
run playwright test tests\platform\smoke\public\homePage.spec.ts --headed
```

Prefer normal `run ...` for regular test execution. Use `run playwright ...` for special Playwright subcommands.

## CLI Option Reference

These are the wrapper options supported directly by `run`:

| Option | Meaning | Example |
| --- | --- | --- |
| `--tag <value>` | filter by tags | `run tests --tag smoke` |
| `-m, --marker <regex>` | regex filter applied to test titles/tags | `run tests --marker "Database|Gen AI"` |
| `-k, --keyword <text>` | plain text title filter | `run tests --keyword landing` |
| `--browser <name>` | browser list, repeat or comma-separate | `run tests --browser chromium,firefox` |
| `--headed` | force headed mode | `run tests\platform\smoke --headed` |
| `--headless` | force headless mode | `run tests\platform\smoke --headless` |
| `--ui` | launch Playwright UI mode | `run tests\platform --ui` |
| `--debug` | launch Playwright debug mode | `run tests\platform\smoke --debug` |
| `-n, --workers <value>` | set worker count | `run tests --workers 2` |
| `--retries <n>` | set retry count | `run tests --retries 1` |
| `--trace <mode>` | set Playwright trace mode | `run tests --trace retain-on-failure` |
| `--video <mode>` | set Playwright video mode | `run tests --video on-first-retry` |
| `--screenshot <mode>` | set screenshot mode | `run tests --screenshot only-on-failure` |
| `--full-page-screenshot <on\|off>` | control Playwright full-page failure screenshots | `run tests --full-page-screenshot on` |
| `--environment <name>` | choose configured environment | `run tests --environment prod` |
| `--base-url <url>` | override configured base URL | `run tests --base-url https://example.com/ords/r/dbpm/livelabs` |
| `--api-base-url <url>` | override the future shared API base URL | `run tests --api-base-url https://example.com/api` |
| `--search-term <term>` | override configured search term | `run tests --search-term OCI` |
| `--storage-state <file>` | run with a Playwright storage-state file | `run tests\\platform --storage-state .auth\\qa-user.json` |
| `--output <dir>` | custom output directory | `run tests --output artifacts\adhoc\local-run` |
| `--junit <on|off>` | enable or disable JUnit XML | `run tests --junit off` |
| `--junit-file <file>` | set JUnit XML path | `run tests --junit-file artifacts\custom\junit.xml` |
| `--json <on\|off>` | enable or disable the JSON report | `run tests --json off` |
| `--json-file <file>` | set JSON report path | `run tests --json-file artifacts\custom\results.json` |
| `--maxfail <n>` | stop after the first `n` failures | `run tests --maxfail 1` |
| `--collect-only` | list tests without running them | `run tests --collect-only` |
| `--dry-run` | print the resolved command and exit | `run tests\platform --dry-run` |
| `--quiet` | suppress stdio | `run tests --quiet` |
| `-h, --help` | show wrapper help | `run -h` |

### Important Notes About Options

Worker behavior:

- `--workers 0`
- `--workers 1`
- `--workers off`
- `--workers none`

all map to serial Playwright execution with `1` worker.

Browser behavior:

- the wrapper chooses from `chromium`, `firefox`, and `webkit`
- current default browser list is `chromium`
- passing multiple browsers runs multiple Playwright projects

Environment behavior:

- environment names are validated against `config/project_settings.json`
- the current repository only defines `prod`
- add more environments there before using them on the CLI
- `--base-url` overrides both Playwright navigation defaults and the shared `environmentConfig.base_url` fixture for the current run

Search-term behavior:

- the `livelabsSearchTerm` fixture is configurable
- `--search-term` is most useful for specs or helpers that intentionally use the configured/default token pattern
- the current smoke matrices use literal terms such as `Gen AI` and `Database`, so `--search-term` does not change those specific tests today

## Passing Raw Playwright Options Through the Wrapper

If you need a Playwright CLI option that the wrapper does not expose directly, add `--` and pass the raw flags after it.

Examples:

```powershell
run tests\platform -- --grep-invert "Database"
run tests\platform -- --last-failed
run tests\platform -- --repeat-each=3
run tests\platform -- --shard=1/2
```

Everything after `--` is appended to the generated Playwright command.

## Common Command Recipes

Run everything:

```powershell
run
```

Collect all tests without executing:

```powershell
run tests --collect-only
```

Run only smoke:

```powershell
run tests\platform\smoke
run tests --tag smoke
```

Run only regression:

```powershell
run tests\platform\regression
run tests --tag regression
```

Run search-related tests:

```powershell
run tests --tag search
```

Run only landing-page-related smoke tests:

```powershell
run tests --tag smoke --keyword landing
```

Run the suite headed:

```powershell
run tests\platform\smoke --headed
```

Run the suite in Firefox:

```powershell
run tests\platform --browser firefox
```

Run the suite in Chromium and Firefox:

```powershell
run tests\platform --browser chromium,firefox
```

Stop after the first failure:

```powershell
run tests\platform\smoke --maxfail 1
```

Preview the resolved command without running it:

```powershell
run tests\platform\smoke --dry-run
```

Open the latest HTML report:

```powershell
run report
```

Open the smoke report directly:

```powershell
run report smoke
```

Open the latest trace:

```powershell
run trace
```

Launch Playwright codegen against LiveLabs home:

```powershell
run codegen /home
```

## npm Scripts

The preferred local workflow is `run ...`, but the project also exposes npm scripts.

| Script | Meaning |
| --- | --- |
| `npm run test` | runs `node ./scripts/qa.mjs` |
| `npm run test:collect` | lists tests via the wrapper |
| `npm run doctor` | runs the wrapper doctor command |
| `npm run typecheck` | runs `tsc --noEmit` |
| `npm run ui` | launches Playwright UI through the wrapper |
| `npm run report` | opens the most recently updated HTML report |
| `npm run trace` | opens the most recently updated trace |
| `npm run codegen` | launches Playwright codegen through the wrapper |
| `npm run install:browsers` | runs `playwright install` directly |

For an explicit report path, use either:

```powershell
npm run report -- artifacts\platform\smoke\html-report
```

or:

```powershell
run report artifacts\platform\smoke\html-report
```

## Browser and Environment Behavior

### Default Browser Projects

Playwright declares three projects:

- `chromium`
- `firefox`
- `webkit`

The default browser list in `config/project_settings.json` is currently:

```json
["chromium"]
```

### Chromium Channel Fallback on Windows

The framework can force or auto-detect a Chromium channel through `resolveChromiumChannel()` in `config/projectConfig.ts`.

Supported values:

- `msedge`
- `chrome`

Automatic behavior:

- on Windows, if Edge or Chrome is installed locally, the Chromium project uses that channel automatically
- this makes the suite usable even when Playwright-managed browser downloads are blocked

If you need to force a channel explicitly:

```powershell
$env:QA_BROWSER_CHANNEL = "chrome"
run tests\platform\smoke
```

or:

```powershell
$env:QA_BROWSER_CHANNEL = "msedge"
run tests\platform\smoke
```

### Environments

Configured environments live in `config/project_settings.json`.

Current environment list:

- `prod`

Current `prod` URL:

- `https://livelabs.oracle.com/ords/r/dbpm/livelabs`

To add another environment:

1. add it to the `environments` block in `config/project_settings.json`
2. optionally change `default_environment`
3. run `run doctor`
4. run a smoke slice against the new environment with `--environment <name>`

Example:

```json
{
  "default_environment": "prod",
  "environments": {
    "prod": {
      "base_url": "https://livelabs.oracle.com/ords/r/dbpm/livelabs",
      "api_base_url": "https://livelabs.oracle.com/api"
    },
    "stage": {
      "base_url": "https://example-stage/ords/r/dbpm/livelabs",
      "api_base_url": "https://example-stage/api"
    }
  }
}
```

Then run:

```powershell
run tests\platform\smoke --environment stage
```

If you later need authenticated coverage without changing the current anonymous suite defaults:

```powershell
run tests\platform --storage-state .auth\qa-user.json
```

## Artifacts and Reporting

The wrapper writes Playwright output to lane-specific folders.

Default lane behavior:

- smoke runs resolve to `artifacts/platform/smoke/test-results`
- regression runs resolve to `artifacts/platform/regression/test-results`
- everything else resolves to `artifacts/platform/adhoc/test-results`

Related outputs:

- HTML report goes next to `test-results` as `html-report`
- JUnit XML goes next to `test-results` as `junit.xml`
- JSON report goes next to `test-results` as `results.json`
- retained traces and videos live under the relevant `test-results/<test-name>/...` directory when a test fails

Examples:

- `run tests\platform\smoke`
  - `artifacts/platform/smoke/test-results`
  - `artifacts/platform/smoke/html-report`
  - `artifacts/platform/smoke/junit.xml`
  - `artifacts/platform/smoke/results.json`

- `run tests\platform\regression`
  - `artifacts/platform/regression/test-results`
  - `artifacts/platform/regression/html-report`
  - `artifacts/platform/regression/junit.xml`
  - `artifacts/platform/regression/results.json`

Override behavior:

- `--output <dir>` changes the Playwright output directory
- `--junit off` disables JUnit for that run
- `--junit-file <file>` places JUnit XML in a custom location
- `--json off` disables the JSON report for that run
- `--json-file <file>` places the JSON report in a custom location
- `--retries <n>` changes retry behavior for that run
- `--trace`, `--video`, `--screenshot`, and `--full-page-screenshot` change artifact policy for that run

Note:

- `--collect-only` does not generate JUnit XML or JSON reports

### Automatic Diagnostic Attachments

When a test executes, the fixture layer can contribute additional attachments beyond Playwright's native artifacts.

Always attached:

- `qa-run-context`

Attached when data exists:

- `qa-console.log`
- `qa-page-errors.log`
- `qa-request-failures.log`
- `qa-response-errors.log`
- `qa-notes.log`

Attached on failure:

- `failure-page-state`
- `failure-dom-snapshot`

Playwright-native failure artifacts still remain the primary browser-debug artifacts:

- screenshot according to the configured screenshot policy
- `trace.zip`
- `video.webm`
- `error-context.md`

### Artifact Glossary

Use this table when you want to know what a file means without reverse-engineering the report output.

| Artifact | Produced By | When It Appears | Where It Lands | Why It Matters |
| --- | --- | --- | --- | --- |
| `html-report/` | Playwright HTML reporter | every real run | next to `test-results` | first place to inspect a failure interactively |
| `junit.xml` | Playwright JUnit reporter | when JUnit is enabled | next to `test-results` | CI systems and test result ingestion |
| `results.json` | Playwright JSON reporter | when JSON reporting is enabled | next to `test-results` | machine-readable run parsing and automation |
| `test-results/` | Playwright core runner | every real run | lane-specific artifact folder | root folder for raw execution artifacts |
| screenshot attachment | Playwright screenshot policy | on failure according to screenshot mode | inside the affected test result folder and report | visual evidence of the UI state |
| `trace.zip` | Playwright tracing | on failure or retry according to trace mode | inside the affected test result folder | richest browser timeline for debugging |
| `video.webm` | Playwright video capture | on failure or retry according to video mode | inside the affected test result folder | useful for watching a failure play out |
| `error-context.md` | Playwright | on failure | inside the affected test result folder | compact text summary and page snapshot |
| `qa-run-context` | project diagnostics fixture | every executed test | report attachment and JSON output | records environment, URL, browser, retry, and artifact policy |
| `qa-console.log` | project diagnostics fixture | when console messages exist | report attachment and JSON output | browser console evidence |
| `qa-page-errors.log` | project diagnostics fixture | when page errors exist | report attachment and JSON output | uncaught browser-side exceptions |
| `qa-request-failures.log` | project diagnostics fixture | when requests fail at transport level | report attachment and JSON output | failed network calls, DNS issues, blocked requests |
| `qa-response-errors.log` | project diagnostics fixture | when HTTP status is at or above the configured threshold | report attachment and JSON output | backend or environment failures that still returned a response |
| `qa-notes.log` | project diagnostics fixture | when a test or fixture adds notes | report attachment and JSON output | extra maintainer notes or artifact-capture warnings |
| `failure-page-state` | project diagnostics fixture | on failure | report attachment and JSON output | final page URL and title when the test ended |
| `failure-dom-snapshot` | project diagnostics fixture | on failure when enabled | report attachment and JSON output | raw HTML snapshot for difficult UI/debug cases |

Fast triage order:

1. Open `run report`.
2. Read the failing step and attachments.
3. Open `trace.zip` with `run trace` if the report is not enough.
4. Check `qa-response-errors.log` or `qa-request-failures.log` if the failure might be environmental.
5. Check `failure-dom-snapshot` when the UI looks incomplete or suspicious.

## TypeScript and Module Rules

The project uses:

- `module: "NodeNext"`
- `moduleResolution: "NodeNext"`
- `strict: true`
- `noEmit: true`

This has an important consequence:

- use ESM-style imports
- use `.js` in relative import specifiers inside `.ts` files

Example:

```ts
import { test } from "../../../support/test.js";
```

Do not write:

```ts
import { test } from "../../../support/test";
```

## How Current Specs Are Written

Current conventions:

- import `test` from `tests/support/test.js`
- define a local tag array constant
- keep one high-signal behavior per test
- use `test.step(...)` for readable execution reports
- annotate useful runtime context with `testInfo.annotations`
- use `qaArtifacts.captureCheckpoint(...)` only when a test genuinely needs a named screenshot beyond the default failure artifacts
- delegate selectors and low-level behavior to page objects

Example spec shape:

```ts
import { test } from "../../../support/test.js";

const TAGS = ["@smoke", "@platform", "@search", "@ui"];

test.describe("Some platform behavior", { tag: TAGS }, () => {
  test("does something important", async ({ homePage, environmentConfig, targetEnvironment }, testInfo) => {
    testInfo.annotations.push({
      type: "environment",
      description: `${targetEnvironment} -> ${environmentConfig.base_url}`,
    });

    await test.step("Open the page", async () => {
      await homePage.goto(environmentConfig.base_url);
    });

    await test.step("Verify the result", async () => {
      await homePage.assertLoaded();
    });
  });
});
```

## How Page Objects Are Written

Current conventions:

- extend `BasePage`
- keep locators as getters
- keep assertions and reusable behavior inside the page object
- avoid raw `waitForTimeout`
- prefer `BasePage` helpers such as `waitForVisible`, `fillWhenReady`, and `clickWhenReady`

Example shape:

```ts
import type { Locator, Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

export class ExamplePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Example" });
  }

  async assertLoaded(): Promise<void> {
    await this.assertVisible(this.heading);
  }
}
```

## How to Add More Tests

### Add a New Spec

1. choose `smoke` or `regression`
2. put the file under `tests/platform/<smoke|regression>/<area>/`
3. import `test` from `tests/support/test.js`
4. assign tags intentionally
5. use the existing fixture/page-object model where possible
6. run `npm run typecheck`
7. run the new spec directly with `run <path-to-spec>`

### Add a New Page Object

1. create the page object under `pages/platform/...`
2. extend `BasePage`
3. add focused locators and methods
4. if multiple specs need it, expose it from `tests/support/test.ts`

### Add a New Shared Fixture

Update `tests/support/test.ts` when:

- several specs need the same page object
- several specs need the same worker-scoped runtime value

Keep worker-scoped and test-scoped fixtures separated, as the current file does.

### Add Data-Driven Cases

If the matrix will grow:

1. create a JSON file under `tests/data/...`
2. add a typed helper under `tests/support/...`
3. keep the spec focused on behavior, not data plumbing

The current search regression pattern is the reference example.

### Add New Tags

If a new test slice needs a new tag:

1. add the tag string to the suite tag array
2. keep the meaning obvious and stable
3. update this README so the tag inventory stays accurate

Examples of good tags:

- `@search`
- `@catalog`
- `@navigation`
- `@ui`

## How to Change Runtime Defaults

Update `config/project_settings.json` when you want to change:

- default browsers
- default headed mode
- default worker mode
- default retry mode
- default trace mode
- default video mode
- default screenshot mode
- default JSON report behavior
- default diagnostics capture behavior
- default search term
- default artifact root
- default JUnit behavior

Current default block:

```json
{
  "browsers": ["chromium"],
  "headed": false,
  "workers": "0",
  "retries": "0",
  "test_timeout_ms": 60000,
  "expect_timeout_ms": 15000,
  "action_timeout_ms": 15000,
  "navigation_timeout_ms": 20000,
  "page_ready_timeout_ms": 15000,
  "optional_load_timeout_ms": 5000,
  "cookie_timeout_ms": 2000,
  "navigation_retries": 1,
  "tracing": "retain-on-failure",
  "video": "retain-on-failure",
  "screenshot": "only-on-failure",
  "full_page_screenshot": true,
  "livelabs_search_term": "OCI",
  "artifacts_dir": "artifacts/platform/adhoc/test-results",
  "junit": "on",
  "json_report": "on",
  "capture_console": true,
  "capture_page_errors": true,
  "capture_request_failures": true,
  "capture_response_errors": true,
  "response_error_status": 400,
  "attach_dom_snapshot_on_failure": true
}
```

After changing defaults, run:

```powershell
run doctor
run tests\platform --collect-only
run tests\platform\smoke --maxfail 1
```

## How to Extend the Framework Safely

Keep these boundaries in mind:

- specs are the executable source of truth
- page objects own selectors and browser behavior
- support helpers own shared data-loading or shared fixture setup
- config helpers own environment and default-value resolution
- the runner owns CLI parsing, artifact paths, and wrapper-friendly behavior

If you add a brand-new top-level lane in the future, you will likely need to update:

- `tests/...` directory structure
- `scripts/qa.mjs` lane detection in `detectRunLane()`
- this README
- the runbooks under `docs/runbooks`

Do not add placeholder directories or future-only abstractions before real tests exist.

## How to Upgrade Dependencies

### Normal Upgrade Path

1. update versions in `package.json`
2. run `run install --skip-browsers` if you only need packages
3. or run `run install` if you also want Playwright-managed browsers
4. run `npm run typecheck`
5. run `run tests\platform --collect-only`
6. run `run tests\platform\smoke --maxfail 1`
7. run `run tests\platform\regression --maxfail 1`
8. review the HTML report if needed

### If You Upgrade Playwright

Verify:

- the wrapper still passes supported option values cleanly
- the browser channel fallback still behaves as expected on Windows
- the current page objects still match the site DOM
- the report output paths still land where expected

### If You Upgrade TypeScript

Verify:

- `NodeNext` import rules still work as expected
- `.js` import suffixes are still correct
- strict mode does not introduce new implicit-any gaps

## Troubleshooting

### `run` Is Not Recognized

Cause:

- the VS Code terminal has not been restarted after opening the workspace
- or you are not using a terminal that inherited `.vscode/settings.json`

Fix:

- restart the VS Code terminal
- or use `.\run.ps1 ...`
- or use `run.cmd ...`
- or use `node scripts/qa.mjs ...`

### Node Is Not Found

Cause:

- `node` is not on `PATH`

Fix:

- install Node.js `>= 20`
- reopen the terminal
- run `run doctor`

### Browser Download Fails During `run install`

Cause:

- network blocks Playwright browser downloads

Fix:

- run `run install --skip-browsers`
- rely on the Windows local Chromium channel fallback
- use `--browser firefox` or `--browser webkit` only after those browsers are actually installed through Playwright

### Feature Files Do Not Run

Cause:

- feature files are intentionally not part of the framework anymore

Fix:

- run the matching spec under `tests/...`

### Tests Need Retries or Raw Playwright Flags

Fix:

- pass raw Playwright CLI options after `--`

Example:

```powershell
run tests\platform -- --last-failed
```

## Quick Start

If you just want the shortest happy path:

```powershell
run install --skip-browsers
run doctor
run tests\platform --collect-only
run tests\platform\smoke --maxfail 1
npm run typecheck
```

## Current Reference Commands

Most useful day-to-day:

```powershell
run
run doctor
run tests\platform
run tests\platform --collect-only
run tests\platform\smoke
run tests\platform\regression
run tests\platform\smoke\public\homePage.spec.ts
run tests --tag smoke
run tests --tag regression
run tests --tag search
run tests --headed
run tests --debug
run tests --dry-run
npm run typecheck
npm run report
```
