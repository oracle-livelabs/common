# V3 Linked Domain Implementation Report

Date: 2026-05-26
Status: implemented and ready for review

## Summary

The TMS prototype now behaves like a linked domain application instead of a collection of static tables. Visible IDs route to object detail pages, core records can be edited in context, and each detail page shows related records.

## Implemented Object Views

| Object | Detail/Edit Coverage |
| --- | --- |
| Project | Edit name, owner, release, status, and description; inspect linked documents, suites, plans, and executions. |
| Requirement Document | Edit project, title, owner, version, status, and summary; inspect child requirements and plans. |
| Requirement | Edit document linkage, title, priority, source, and status; inspect linked tests, plans, executions, and defects. |
| Test Suite | Edit project, name, owner, and status; inspect tests and plans. |
| Test Case | Edit suite linkage, requirement linkage, title, type, priority, automation, status, steps, and expected result; inspect linked plans, executions, and defects. |
| Test Plan | Edit project, requirement document, name, build, owner, and status; inspect suites, tests, executions, and defects. |
| Execution | Edit plan, test case, build, assignee, status, and evidence; inspect plan, test case, requirement, and defects. |
| Defect | Inspect Jira-ready local mapping to test case and execution. |

## Relationship Helpers

Added state helpers for:

- `getRequirementLinks`
- `getTestCaseLinks`
- `getPlanLinks`
- `getExecutionLinks`
- `updateExecution`

These helpers power detail pages and are covered by unit tests.

## Validation

| Command | Result |
| --- | --- |
| `node --check app/public/app.js` | Passed |
| `node --check app/public/state.mjs` | Passed |
| `node --check app/scripts/browser-smoke.mjs` | Passed |
| `npm test` | Passed: 9 tests, 9 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed |
| `npm run smoke` | Passed |
| HTTP probe | Passed: `http://127.0.0.1:4193` returned `200` |

Browser smoke now verifies the `TC-001 -> REQ-001 -> TP-2026-05 -> EX-001` linked path and confirms reload persistence on the execution detail route.

## Next Improvements

1. Add first-class link and unlink controls on every detail page.
2. Add execution cycles and test run records separate from the current execution rows.
3. Add immutable test case versions before supporting production execution history.
4. Add step-level execution results and evidence attachments.
5. Add archive rules that block destructive deletes after execution history exists.
6. Add TMS roles and permissions once backend architecture is selected.
