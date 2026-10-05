# LiveLabs QA Hub Status Report

Date: 2026-05-26
Status: ready for review

## Summary

Created the `LiveLabs QA Hub` project under `Projects` with first-draft requirements, implementation planning, capability folders, and a local Redwood-styled hub prototype.

The prototype starts with authentication, supports seeded `admin` and `user` accounts, uses a left-side navigation shell, shows hub sections, and demonstrates role-gated local CRUD for accounts and QA Watchdog records.

## Project Path

```text
C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs QA Hub
```

## Local Review URL

```text
http://127.0.0.1:4192
```

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@livelabs.qa` | `admin123` |
| User | `user@livelabs.qa` | `user123` |

## Created Artifacts

| Area | Files |
| --- | --- |
| Requirements | `docs\requirements.md` |
| Plan | `docs\implementation-plan.md` |
| Jira source notes | `docs\jira-source-notes.md` |
| Tasks | `docs\task-list.md` |
| Validation | `docs\validation-report.md` |
| Redwood design notes | `docs\redwood-design-notes.md` |
| Prototype | `app\public\index.html`, `app\public\app.js`, `app\public\state.mjs`, `app\public\styles.css` |
| Tests | `app\tests\state.test.mjs`, `app\scripts\validate-project.mjs`, `app\scripts\browser-smoke.mjs` |
| Sections | `sections\qa-watchdog`, `sections\health-monitor`, `sections\automation-runs`, `sections\livestack-qa`, `sections\platform-content-qa`, `sections\usage-metrics`, `sections\sprint-ops`, `sections\reports-insights`, `sections\user-access` |

## Validation Results

| Command | Result |
| --- | --- |
| `npm test` | Passed: 6 tests, 6 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed, static app built to `app\dist` |
| `npm run smoke` | Passed, headless Chrome smoke validated auth and role-gated controls |

## Latest Recheck

Date: 2026-05-26

The user redirected after an unrelated feedback note. No project source changes were made for that ignored feedback. The existing LiveLabs QA Hub prototype was rechecked in place.

| Check | Result |
| --- | --- |
| Local server | Running at `http://127.0.0.1:4192` |
| HTTP probe | Passed: status `200` |
| `npm test` | Passed: 6 tests, 6 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed |
| `npm run smoke` | Passed |

Browser smoke screenshot:

```text
C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs QA Hub\resources\browser-smoke-admin.png
```

## Current Assumptions

- Health monitoring from Jira `LDA-1492` is one page/capability inside the larger QA Hub.
- `QA Watchdog` and `Health Monitor` are the likely first MVP pages.
- The first prototype can be local/demo-only until production stack, auth, and data ownership are selected.
- Production should not store credentials or authoritative QA data in browser storage.

## Proposed Improvements

1. Pick the production stack: Oracle JET/Redwood, APEX/ORDS, or a service-backed app using this prototype as product reference.
2. Add a real data model for users, roles, watchdog events, monitors, automation runs, evidence links, and reports.
3. Add read-only Jira ingestion before any Jira write workflow.
4. Add CI/CD automation run ingestion and artifact linking.
5. Add LiveLabs analytics import with freshness and data-quality warnings.
6. Add monitor thresholds and escalation rules for Datadog-like watchdog behavior.
7. Add audit logs for account changes, status changes, and report generation.
8. Add exportable reports for leadership, PM, and release readiness.

## V2 Plan Created

Date: 2026-05-26

Created second-version planning artifacts for feature rework and improvement:

| Artifact | Purpose |
| --- | --- |
| `docs\v2-rework-plan.md` | Main V2 product and implementation plan. |
| `docs\v2-feature-backlog.md` | Prioritized backlog with must-have, should-have, deferred, and out-of-scope items. |
| `docs\v2-qa-plan.md` | Validation plan and test cases for the V2 implementation pass. |

Recommended V2 build slice:

1. Foundation: richer state model, helpers, session/route persistence, audit log, source/freshness model.
2. Operational pages: Command Center, QA Watchdog, Health Monitor, Admin Console.
3. Evidence and reports: report templates, export, screenshots, validation updates.

## V2 Implementation Completed

Date: 2026-05-26

Implemented the V2 prototype rework in the existing static app.

Completed V2 changes:

| Area | Implemented |
| --- | --- |
| State model | Added sources, evidence, monitors, health checks, report templates, audit events, and V2 seed state. |
| Command Center | Reworked into triage view with Action Queue, Health By Domain, Recent Evidence, and Needs Decision sections. |
| QA Watchdog | Added Alerts, Logs, Monitors, and Incidents tabs; alert detail drawer; local monitor creation; source/evidence context. |
| Health Monitor | Added source-aware health check table, stale/freshness labels, owners, cadence, evidence, and domain drilldowns. |
| Admin Console | Added users, roles, data sources, demo data reset, and audit events in one admin surface. |
| Session behavior | Added local session persistence and route persistence until explicit Sign out. |
| Reports | Added local report templates and Markdown/JSON preview generation. |
| Safety | Kept all data local/demo-only; no Jira writes, notifications, credentials, or production-source claims. |

V2 validation:

| Command | Result |
| --- | --- |
| `npm test` | Passed: 12 tests, 12 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed |
| `npm run smoke` | Passed: login, admin console, watchdog alert creation/detail, health monitor, refresh session/route persistence, report preview, sign out, user read-only controls |
| Static hygiene scans | Passed: unfinished task-marker scan and trailing whitespace scan clean |
| Screenshot sanity check | Passed: `resources\browser-smoke-admin.png` rendered V2 Health Monitor view |

Current live review URL:

```text
http://127.0.0.1:4192
```

Current local server:

```text
PID 34848 on 127.0.0.1:4192
```

## Review Questions

1. Should the MVP start with `QA Watchdog` plus `Health Monitor`, or should usage metrics be in the first build slice?
2. Should the production backend be ORDS/Oracle Database-first?
3. Should Jira be read-only at first, or should the hub create/update Jira issues after approval gates?
4. What roles are needed beyond `user` and `admin`?
5. Which current LiveLabs analytics outputs should be treated as authoritative inputs?

## Stop Point

Waiting for review before expanding into production backend, real integrations, Jira write operations, or notification workflows.

## V4 Test Management Rework Completed

Date: 2026-05-26

Reworked the QA Hub Test Management page and expanded the linked TMS app.

QA Hub changes:

| Area | Implemented |
| --- | --- |
| Test Management page | Replaced simple link page with a richer launch/decision page. |
| Launch action | Renamed `Open LiveLabs TMS` to `Open LiveLabs QA TMS`. |
| Pre-launch guidance | Added when-to-use guidance, integration points, KPI tiles, and suggested workflow. |
| Validation | Browser smoke now verifies the new page wording and renamed launch action. |

Linked TMS changes:

| Area | Implemented |
| --- | --- |
| Projects/features | Create local QA scopes for features or projects. |
| Requirement documents | Create feature/project requirement documents and link requirements to them. |
| Requirements | Create/update/remove requirements and inspect requirement traceability. |
| Test suites | Create suites and link suites to test plans. |
| Test cases | Create tests with steps, expected results, suite, requirement, type, priority, automation, and status. |
| Test plans | Create plans linked to project, requirement document, build, suites, and individual tests. |
| Plan test membership | Add and remove tests inside each plan. |
| Test execution | Create execution runs and update execution status. |
| Reports | Generate local execution/coverage reports. |
| Traceability | Added document traceability and requirement traceability matrix. |

Validation:

| Command | Result |
| --- | --- |
| QA Hub `npm test` | Passed: 14 tests, 14 passed |
| QA Hub `npm run validate` | Passed |
| QA Hub `npm run build` | Passed |
| QA Hub `npm run smoke` | Passed |
| TMS `npm test` | Passed: 7 tests, 7 passed |
| TMS `npm run validate` | Passed |
| TMS `npm run build` | Passed |
| TMS `npm run smoke` | Passed after updating the smoke assertion for the renamed Traceability page |

Current local servers:

```text
QA Hub PID: 31724 on http://127.0.0.1:4192
TMS PID:    3588 on http://127.0.0.1:4193
```

## V5 Dynamic Navigation And Linked TMS Plan

Date: 2026-05-26

Created architecture plans to address the latest review feedback:

| Artifact | Purpose |
| --- | --- |
| `docs\v5-operations-navigation-rework-plan.md` | Rebuild QA Operations into grouped navigation with breadcrumbs, back controls, sibling navigation, and deep operations routes. |
| `..\LiveLabs TMS\docs\v3-linked-domain-rebuild-plan.md` | Rebuild TMS around clickable object IDs, routeable detail pages, real relationship tables, object CRUD, test-case versions, plan items, execution cycles, test runs, evidence, defects, and traceability. |

Key correction:

- The next implementation should stop treating TMS as tables with IDs inside them.
- Every visible ID should become a link to an object detail page with edit controls, linked records, audit/history, and safe archive/delete behavior.
- QA Operations subpages must include breadcrumb, back-to-operations, and sibling navigation controls.

## V3 Rework Completed

Date: 2026-05-26

Implemented the V3 reorganization and linked TMS slice requested after prototype review.

Completed V3 changes:

| Area | Implemented |
| --- | --- |
| Navigation | Reduced the main menu to Command Center, QA Operations, GitHub Intake, Knowledge Base, Test Management, Reports, and Admin Console. |
| Command Center action | Renamed the confusing Dashboard action to `Command Center` and only shows it when the user is away from the Command Center. |
| Help pattern | Removed the title-side tooltip pattern from page headings and replaced it with inline page context plus helper text that wraps responsively. |
| Operations | Moved Watchdog, Health Monitor, Automation Runs, LiveStack QA, Platform And Content, Usage Metrics, and Sprint Ops into QA Operations launchers. |
| GitHub Intake | Added PR/issue/log queue, history feed, seeded records, and admin-only local record creation. |
| Knowledge Base | Added NotebookLM-style source-note intake, review pipeline counters, seeded notes, and admin-only local note creation. |
| Test Management | Added a linked TMS page pointing to the separate LiveLabs TMS app at `http://127.0.0.1:4193`. |
| Section folders | Added `sections\github-intake`, `sections\knowledge-base`, and `sections\test-management`. |
| Route persistence | Fixed hidden operation-page route persistence after browser refresh. |
| Documentation | Added `docs\v3-rework-plan.md` and updated the task list. |

Linked TMS project:

```text
C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs TMS
```

Current live review URLs:

```text
QA Hub: http://127.0.0.1:4192
TMS:    http://127.0.0.1:4193
```

Current local servers:

```text
QA Hub PID: 20192
TMS PID:    24224
```

V3 validation:

| Command | Result |
| --- | --- |
| QA Hub `npm test` | Passed: 14 tests, 14 passed |
| QA Hub `npm run validate` | Passed |
| QA Hub `npm run build` | Passed |
| QA Hub `npm run smoke` | Passed: auth, role gates, operations, watchdog, health monitor, route/session persistence, GitHub intake, Knowledge Base, TMS link, reports |
| TMS `npm test` | Passed: 7 tests, 7 passed |
| TMS `npm run validate` | Passed |
| TMS `npm run build` | Passed |
| TMS `npm run smoke` | Passed: repository creation, execution update, coverage, report preview |
| HTTP probes | Passed: both local URLs returned `200` |

Recommended next improvements:

1. Decide the production architecture: Oracle JET/Redwood plus ORDS APIs, APEX/ORDS, or another approved stack.
2. Add read-only GitHub and Jira ingestion before considering any writeback.
3. Promote QA Knowledge Base notes into formal requirements only after human review.
4. Add explicit links from Watchdog alerts to TMS requirements, test cases, executions, and defects.
5. Add import adapters for Playwright/JUnit/Cucumber results.
6. Expand roles beyond `user` and `admin`: Viewer, QA Analyst, Domain Owner, Admin.

## V6 Dynamic Operations And Linked TMS Implementation Completed

Date: 2026-05-26

Implemented the approved dynamic slice for QA Operations and the linked TMS prototype.

QA Hub changes:

| Area | Implemented |
| --- | --- |
| QA Operations | Replaced the cluttered flat card wall with grouped navigation bands, compact operations metrics, recent activity, and suggested next actions. |
| Subpage navigation | Added breadcrumb, Back to QA Operations, previous/next controls, and sibling subnavigation to operations subpages. |
| Responsiveness | Added compact row-based controls that collapse cleanly on smaller screens. |
| Smoke coverage | Browser smoke now validates grouped operations, subpage chrome, back navigation, sibling navigation, and route persistence. |

Linked TMS changes:

| Area | Implemented |
| --- | --- |
| Object routing | TMS IDs route to detail pages and persist after refresh. |
| Detail/edit pages | Added editable detail pages for requirements, test cases, test plans, and executions. |
| Supporting details | Added project, requirement document, suite, and defect details for linked navigation. |
| Relationship graph | Added state helpers for requirement, test case, plan, and execution relationship traversal. |
| Smoke coverage | Browser smoke validates `TC-001 -> REQ-001 -> TP-2026-05 -> EX-001` navigation and detail route persistence. |

Validation:

| Command | Result |
| --- | --- |
| QA Hub `npm test` | Passed: 14 tests, 14 passed |
| QA Hub `npm run validate` | Passed |
| QA Hub `npm run build` | Passed |
| QA Hub `npm run smoke` | Passed |
| TMS `npm test` | Passed: 9 tests, 9 passed |
| TMS `npm run validate` | Passed |
| TMS `npm run build` | Passed |
| TMS `npm run smoke` | Passed |
| HTTP probes | Passed: both local URLs returned `200` |
| Static hygiene scans | Passed: task-marker and trailing whitespace scans clean |

Current local servers:

```text
QA Hub PID: 29540 on http://127.0.0.1:4192
TMS PID:    26132 on http://127.0.0.1:4193
```

Implementation report:

```text
docs\v6-dynamic-operations-and-tms-report.md
```

## V7 TMS Cross-Links And Safe Lifecycle Completed

Date: 2026-05-26

Implemented the next linked-application slice after V6.

| Area | Implemented |
| --- | --- |
| Watchdog TMS links | Seeded Watchdog alerts now show linked TMS object pills in alert detail. |
| GitHub Intake TMS links | Seeded GitHub PR/issue/log records now show linked TMS object pills. |
| Existing local state | Older browser-local demo records are normalized with seeded TMS links when possible. |
| TMS link management | TMS detail pages can link tests to requirements, add tests to plans, link suites to plans, and create local defect links from executions. |
| Safe lifecycle | TMS delete actions archive or retire records with history instead of destroying traceability. |
| Direct TMS routes | QA Hub links can open specific TMS objects through hash routes. |

Validation:

| Command | Result |
| --- | --- |
| QA Hub `npm test` | Passed: 14 tests, 14 passed |
| QA Hub `npm run validate` | Passed |
| QA Hub `npm run build` | Passed |
| QA Hub `npm run smoke` | Passed |
| TMS `npm test` | Passed: 11 tests, 11 passed |
| TMS `npm run validate` | Passed |
| TMS `npm run build` | Passed |
| TMS `npm run smoke` | Passed |

Current local servers:

```text
QA Hub PID: 34956 on http://127.0.0.1:4192
TMS PID:    24232 on http://127.0.0.1:4193
```

Implementation report:

```text
docs\v7-tms-cross-links-and-safe-lifecycle-report.md
```
