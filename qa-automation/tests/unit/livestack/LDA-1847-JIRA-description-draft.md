# Proposed description for LDA-1847

## Goal

Add an isolated, repeatable unit-test lane for code in the LiveStack repository and expand coverage without mixing unit tests with the existing learner-facing Playwright suite.

## Source review

Repository: https://github.com/oracle-livelabs/livestack  
Review snapshot: `main` at `87e2399e08e7d121894151befedcaf42ddd2c90c`.

The repository is a multi-application codebase with 33 `package.json` files and more than 100 JavaScript files. A repository search found seven existing Node.js test files in two packages:

- AI Lakehouse ingestion: `backend/test/demoSetupService.test.js` and `backend/test/fullDataLoadService.test.js`. Run with `npm run test:backend` from `ailakehouse/_deploy/ll-lakehouse/ingestion`.
- Finance LiveStack: `verification/conversation-context.test.js`, `verification/jet-input-text.test.js`, `verification/native-ai-static-contract.test.js`, `verification/native-ai-service.test.js`, and `verification/native-ai-bootstrap-contract.test.js`. Run all with `npm test` from `aidatabaseindustrylivestack/terraform-ready-livestack/finance/source/application`.

## QA Automation implementation

Created `qa-automation/tests/unit/livestack` as the central plan and runner home. Added:

- `npm run test:unit:livestack:framework` — framework unit tests for the LiveStack lane's command help and fail-fast source-checkout validation.
- `npm run test:unit:livestack` — runs the framework unit tests, validates package entrypoints, then invokes the two existing source-owned suites above.
- `scripts/livestack-unit.mjs` — accepts `QA_LIVESTACK_ROOT` or `--repo-root`, validates both package scripts before running either, and reports each source suite separately.
- `tests/unit/livestack/UNIT-TEST-PLAN.md` — source inventory, test boundaries, phased expansion, and acceptance criteria.

The central lane keeps source modules and dependency resolution in their owning LiveStack packages. Unit tests should cover deterministic logic and service behavior with injected fakes and temporary fixtures. Database, OCI, network, clock, and AI boundaries should be mocked; real provisioning, credentials, and external services are out of scope for unit runs. Browser-visible flows remain in Playwright.

## Validation completed

- `npm run test:unit:livestack:framework`: 2 passed, 0 failed.
- `npm run typecheck`: passed.
- Node syntax checks and `package.json` JSON parsing: passed.
- The seven source-repository tests were not executed because no local LiveStack checkout is available in this workspace. Set `QA_LIVESTACK_ROOT` to a checkout and run `npm run test:unit:livestack` to establish their baseline.

## Next steps

1. Run the seven existing source tests through the central lane against a local checkout.
2. Inventory active package exports and add focused unit coverage for pure functions, validators, normalizers, import/catalog logic, retries, and job/service state.
3. Require isolated fakes/fixtures and package-owned `test:unit` scripts before adding further packages to the central runner.
4. Keep unit results distinct from Playwright smoke/regression and integration or deployment checks.
