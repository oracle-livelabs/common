# LiveStack unit-test plan

**Ticket:** LDA-1847 — Create unit tests for Livestacks code  
**Source:** [`oracle-livelabs/livestack`](https://github.com/oracle-livelabs/livestack)  
**Review snapshot:** repository `main`, commit `87e2399e08e7d121894151befedcaf42ddd2c90c`  
**Plan date:** 2026-10-13

## Findings

LiveStack is a multi-application repository, not one Node package. GitHub code
search showed 33 `package.json` files and more than 100 JavaScript files. The
apps have their own dependency trees and currently use Node's built-in
`node:test` in at least two areas. A search for `*.test.js` found seven existing
test files:

| Source package | Existing suite | Unit-test focus |
| --- | --- | --- |
| `ailakehouse/_deploy/ll-lakehouse/ingestion` | `backend/test/demoSetupService.test.js`; `backend/test/fullDataLoadService.test.js` | Setup retries/status deduplication; bounded data-load behavior and service orchestration. Run with `npm run test:backend`. |
| `aidatabaseindustrylivestack/terraform-ready-livestack/finance/source/application` | `verification/conversation-context.test.js`; `verification/jet-input-text.test.js`; `verification/native-ai-static-contract.test.js`; `verification/native-ai-service.test.js`; `verification/native-ai-bootstrap-contract.test.js` | Conversation context limits/normalization; JET input text handling; Native AI service behavior and static/bootstrap contracts. Run all with `npm test`. |

The `scripts` directory at repository root currently contains a server-prep
shell script. Other JavaScript utilities exist in the app packages, including
formatting helpers and import/catalog logic; package-local business logic is a
better unit-test target than React page rendering or deployment scripts.

## Test boundaries

- Unit-test deterministic functions, parsers, validators, normalizers, formatters,
  state transitions, bounded retries, and service logic with injected fakes.
- Use temporary directories and fake filesystem inputs for file/import helpers.
- Mock database, OCI, AI/LLM, network, clock, and process boundaries. Unit runs
  must not require credentials, a live database, cloud provisioning, or external
  network access.
- Keep React rendering, route behavior, browser navigation, responsive layout,
  and end-to-end journeys in Playwright. The existing framework's learner-facing
  checks remain a separate browser lane.
- Keep SQL correctness, database compatibility, OCI resource behavior, and
  service-to-service wiring in their owning integration or deployment checks.
- Avoid brittle tests that assert private implementation details or full-page
  markup when a stable exported contract can be tested instead.

## Phased expansion

1. **Adopt and baseline existing tests.** Run the seven discovered cases through
   `npm run test:unit:livestack`; record baseline results per package and retain
   the direct package commands for contributors.
2. **Complete first-party pure-function coverage.** Inventory exported helpers
   in each independently packaged app. Prioritize validation/normalization,
   configuration parsing, deterministic data transforms, and error mapping.
3. **Harden service tests.** Add dependency-injected unit cases for setup,
   import, retry, job-state, and orchestration services. Cover success, invalid
   input, dependency errors, duplicate requests, retry limits, and cleanup.
4. **Add framework regression coverage.** Extend the current Playwright suite
   only for user-visible outcomes that unit tests cannot establish. Keep its
   smoke, regression, and generated-catalog lanes independently runnable.
5. **Standardize package entrypoints and CI.** Give each active LiveStack app a
   predictable `test:unit` script, then have the central runner discover only
   packages declared in a reviewed manifest. Publish per-package results and
   failures in CI; do not silently skip a configured package.

## Initial acceptance criteria

- The central runner requires an explicit local LiveStack checkout and validates
  each configured package and npm script before starting.
- All configured suites run without live credentials or external services.
- Each suite reports its package, command, case count, and failures distinctly.
- The central unit lane can run without Playwright browsers; browser lanes can
  continue to run independently.
- New packages are added deliberately after their unit-test entrypoint and
  isolation requirements are verified.

## Current implementation status

- Created `tests/unit/livestack` as the central planning and runner home.
- Added two framework unit tests for runner help and fail-fast checkout/script
  validation. Run them with `npm run test:unit:livestack:framework`.
- Added `npm run test:unit:livestack`, which runs the framework unit tests, then
  wraps the seven existing source tests through their package-owned commands.
- No new LiveStack source-module tests have been authored in this QA Automation
  checkout; the LiveStack source repository is not checked out here. The first
  expansion pass should add focused cases alongside the source modules, then
  include those package suites in the reviewed runner manifest.
