# V6 Dynamic Operations And Linked TMS Report

Date: 2026-05-26
Status: implemented and ready for review

## Scope

This pass addresses the review that QA Operations felt cluttered and that TMS IDs behaved like static table text instead of dynamic linked records.

## QA Hub Changes

| Area | Implemented |
| --- | --- |
| QA Operations landing | Replaced the flat card wall with grouped operational bands: Monitor And Triage, Evidence And Automation, Domain QA, and Test And Release. |
| Operations summary | Added compact metrics for active alerts, risk or stale checks, and run blockers. |
| Recent activity | Added focused links into Watchdog, Automation Runs, and Health Monitor from the operations landing. |
| Suggested actions | Surfaced the current action queue inside QA Operations. |
| Subpage navigation | Added shared breadcrumb, Back to QA Operations, previous/next controls, and sibling subnavigation to Watchdog, Health Monitor, Automation Runs, and domain QA pages. |
| Smoke coverage | Added browser checks for grouped operations, subpage chrome, back navigation, sibling navigation, and route persistence. |

## TMS Changes

| Area | Implemented |
| --- | --- |
| Object routing | Added routeable object views using local route state, including reload persistence. |
| Clickable IDs | Converted project, document, requirement, suite, test case, plan, execution, and defect IDs into object links where they appear in tables and relationship panels. |
| Requirement detail | Added editable requirement detail with document linkage, priority, status, source, linked tests, plans, executions, defects, and audit history. |
| Test case detail | Added editable test case detail with suite linkage, requirement linkage, title, type, priority, automation, status, steps, expected result, linked plans, executions, defects, and audit history. |
| Plan detail | Added editable test plan detail with project, requirement document, build, owner, status, suite scope, tests, executions, defects, and audit history. |
| Execution detail | Added editable execution detail with plan, test case, build, assignee, status, evidence, linked requirement, linked plan, linked defects, and audit history. |
| Supporting details | Added project, requirement document, suite, and defect detail views so linked objects have a real destination. |
| State helpers | Added relationship graph helpers for requirements, test cases, plans, and executions, plus full execution update support. |
| Smoke coverage | Added browser checks for `TC-001` detail edit, linked `REQ-001`, linked `TP-2026-05`, linked `EX-001`, and reload persistence on the execution detail route. |

## Validation

| Project | Command | Result |
| --- | --- | --- |
| QA Hub | `node --check app/public/app.js` | Passed |
| QA Hub | `node --check app/scripts/browser-smoke.mjs` | Passed |
| QA Hub | `npm test` | Passed: 14 tests, 14 passed |
| QA Hub | `npm run validate` | Passed |
| QA Hub | `npm run build` | Passed |
| QA Hub | `npm run smoke` | Passed |
| TMS | `node --check app/public/app.js` | Passed |
| TMS | `node --check app/public/state.mjs` | Passed |
| TMS | `node --check app/scripts/browser-smoke.mjs` | Passed |
| TMS | `npm test` | Passed: 9 tests, 9 passed |
| TMS | `npm run validate` | Passed |
| TMS | `npm run build` | Passed |
| TMS | `npm run smoke` | Passed |
| Both | HTTP probes | Passed: both local URLs returned `200` |
| Both | Task-marker scan | Passed: no hits outside build/resources exclusions |
| Both | Trailing whitespace scan | Passed |

## Live Review Servers

| App | URL | PID |
| --- | --- | --- |
| QA Hub | `http://127.0.0.1:4192` | `29540` |
| LiveLabs QA TMS | `http://127.0.0.1:4193` | `26132` |

## Review Focus

1. Confirm whether the new QA Operations grouped landing feels easier to scan.
2. Check whether the operations breadcrumb/back/previous/next pattern is useful enough to keep.
3. Open the TMS repository, click `TC-001`, edit it, then navigate through `REQ-001`, `TP-2026-05`, and `EX-001`.
4. Decide whether requirement document, project, suite, and defect detail pages should become full CRUD pages or remain supporting detail pages for now.

## Recommended Next Improvements

1. Add true create/edit link controls on detail pages, such as link test to requirement, add test to plan, and link defect to execution.
2. Add safe archive behavior for executed tests, plans, and requirements instead of direct deletion.
3. Add execution cycles and immutable test case versions before importing real automation results.
4. Add a compact master-detail repository layout for suites and test cases.
5. Add cross-app links from QA Hub Watchdog alerts and GitHub Intake items into TMS objects.
6. Add role-aware TMS permissions after the data model stabilizes.
