# V7 TMS Cross-Links And Safe Lifecycle Report

Date: 2026-05-26
Status: implemented and ready for review

## Scope

This pass extends the linked QA Hub and TMS prototype after the V6 object-detail rebuild. It adds explicit TMS link management, safe archive behavior for records with history, and QA Hub cross-links into TMS object routes.

## QA Hub Changes

| Area | Implemented |
| --- | --- |
| Watchdog to TMS | Seeded Watchdog records now include linked TMS requirements, test cases, plans, or executions. |
| Alert detail | The Watchdog alert drawer shows linked TMS objects as direct links to the TMS app. |
| GitHub Intake to TMS | Seeded GitHub PR/issue/log records now include linked TMS object pills. |
| Existing local state | Startup normalization adds seeded TMS links to existing local demo records when the browser already has older local storage. |
| Cross-app routes | Links open `http://127.0.0.1:4193` with object-route hashes for the target TMS object. |

## TMS Changes

| Area | Implemented |
| --- | --- |
| Requirement coverage linking | Requirement detail can link an existing test case to the requirement. |
| Test case plan membership | Test case detail can add the test to a plan and remove plan membership when there is no execution history. |
| Plan scope management | Plan detail can link suites, add tests, unlink suites, and remove tests. Removal is blocked once execution history exists. |
| Execution defects | Execution detail can create a local Jira-ready defect mapping linked to the execution and test case. |
| Safe lifecycle | Deleting requirements, test cases, plans, or executions with history now archives them instead of destroying linked evidence. |
| Direct object URL support | The TMS app responds to object hash routes, including hash changes after the app is already loaded. |

## Validation

| Project | Command | Result |
| --- | --- | --- |
| QA Hub | `node --check app/public/app.js` | Passed |
| QA Hub | `node --check app/public/state.mjs` | Passed |
| QA Hub | `node --check app/scripts/browser-smoke.mjs` | Passed |
| QA Hub | `npm test` | Passed: 14 tests, 14 passed |
| QA Hub | `npm run validate` | Passed |
| QA Hub | `npm run build` | Passed |
| QA Hub | `npm run smoke` | Passed |
| TMS | `node --check app/public/app.js` | Passed |
| TMS | `node --check app/public/state.mjs` | Passed |
| TMS | `node --check app/scripts/browser-smoke.mjs` | Passed |
| TMS | `npm test` | Passed: 11 tests, 11 passed |
| TMS | `npm run validate` | Passed |
| TMS | `npm run build` | Passed |
| TMS | `npm run smoke` | Passed |

## Live Review Servers

| App | URL | PID |
| --- | --- | --- |
| QA Hub | `http://127.0.0.1:4192` | `34956` |
| LiveLabs QA TMS | `http://127.0.0.1:4193` | `24232` |

## Review Focus

1. Open a seeded Watchdog alert and check the linked TMS object pills in the drawer.
2. Open GitHub Intake and check the TMS object links beside the seeded PR/issue/log records.
3. In TMS, open `TC-001` and use Plan Membership to add or remove a plan link.
4. In TMS, open `TP-2026-05` and use Manage Plan Links to add tests or suites.
5. In TMS, open `EX-001` and create a local defect link.
6. Try removing a test with execution history and confirm the app protects the link.

## Recommended Next Improvements

1. Add real plan-item records so each test-plan membership has owner, priority, risk, and archive state.
2. Add execution cycles and test-run records instead of treating executions as standalone rows.
3. Add immutable test-case versions before supporting production execution history.
4. Add source importers for Playwright, JUnit, Cucumber, and GitHub issue/PR exports.
5. Add role-aware TMS permissions and audit filtering.
