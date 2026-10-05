# V4 Link Management And Safe Lifecycle Report

Date: 2026-05-26
Status: implemented and ready for review

## Summary

The TMS now supports practical relationship management from object detail pages. Users can create and adjust links without returning to generic tables, and destructive actions preserve traceability once execution or defect history exists.

## Implemented

| Area | Capability |
| --- | --- |
| Requirement detail | Link an existing test case to the requirement. |
| Test case detail | Add the test case to a plan and remove plan membership where safe. |
| Plan detail | Link suites, add tests, unlink suites, and remove tests. |
| Execution detail | Create a local defect link tied to the current execution and test case. |
| Safe delete behavior | Requirements with linked tests are retired, tests with execution/defect history are retired, plans with execution history are archived, and executions with result/defect history are archived. |
| Guardrails | Removing a test or suite from a plan is blocked after execution history exists. |
| Direct URLs | Object hash routes open specific detail pages from QA Hub cross-links. |

## Validation

| Command | Result |
| --- | --- |
| `node --check app/public/app.js` | Passed |
| `node --check app/public/state.mjs` | Passed |
| `node --check app/scripts/browser-smoke.mjs` | Passed |
| `npm test` | Passed: 11 tests, 11 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed |
| `npm run smoke` | Passed |

Browser smoke now verifies:

- Editing `TC-001`.
- Adding `TC-001` to another plan from test-case detail.
- Adding `TC-005` to `TP-2026-05` from plan detail.
- Creating a defect link from `EX-001`.
- Reloading on an object route.
- Opening a direct hash route to `TC-001`.

## Boundaries

- Defect links are local and Jira-ready only; the app does not write to Jira.
- Plan membership is still stored as `scope` arrays. A future pass should promote this to explicit plan-item records.
- Execution cycles and immutable test-case versions remain future work.
