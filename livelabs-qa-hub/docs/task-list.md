# LiveLabs QA Hub Task List

Status legend: `Done`, `Ready`, `Needs Review`, `Blocked`

## Completed In This Draft

| Status | Task |
| --- | --- |
| Done | Create `Projects\LiveLabs QA Hub` project folder. |
| Done | Capture Jira `LDA-1492` source notes. |
| Done | Draft requirements document. |
| Done | Draft implementation plan. |
| Done | Create section folders for first hub capabilities. |
| Done | Build local prototype with login, role display, left navigation, account CRUD, and watchdog CRUD. |
| Done | Add local tests and validation scripts. |

## Review Tasks

| Status | Task |
| --- | --- |
| Needs Review | Review `docs\v2-rework-plan.md` and confirm the V2 scope. |
| Needs Review | Confirm whether V2 should prioritize Command Center, QA Watchdog, Health Monitor, and Admin Console first. |
| Needs Review | Confirm role model beyond `user` and `admin` for future builds. |
| Needs Review | Confirm production stack direction. |
| Needs Review | Confirm source systems and owners for Jira, CI/CD, LiveLabs analytics, WMS/TMS, and LiveStack. |
| Needs Review | Confirm which reports leadership needs first. |

## V2 Planning Tasks

| Status | Task |
| --- | --- |
| Done | Create `docs\v2-rework-plan.md`. |
| Done | Create `docs\v2-feature-backlog.md`. |
| Done | Create `docs\v2-qa-plan.md`. |
| Done | Implement V2 foundation: state model, helpers, session/route persistence, audit log, source/freshness model. |
| Done | Rework Command Center into triage and action-queue view. |
| Done | Rework QA Watchdog into alerts, logs, monitors, and incidents tabs. |
| Done | Rework Health Monitor into configurable check table and domain drilldowns. |
| Done | Add Admin Console with users, roles, sources, monitors, demo data, and audit events. |
| Done | Add report templates and local Markdown/JSON previews. |
| Done | Expand unit and browser smoke tests for V2 workflows. |

## V2 Review Tasks

| Status | Task |
| --- | --- |
| Needs Review | Review live V2 prototype at `http://127.0.0.1:4192`. |
| Needs Review | Confirm whether Command Center action queue is the right landing experience. |
| Needs Review | Confirm Watchdog tab naming: Alerts, Logs, Monitors, Incidents. |
| Needs Review | Confirm whether Admin Console should stay separate from user profile. |
| Needs Review | Confirm whether V3 should stay static/demo or move to ORDS/Oracle Database, APEX, or Oracle JET app structure. |

## V3 Rework Tasks

| Status | Task |
| --- | --- |
| Done | Rename the confusing Dashboard return action to `Command Center`. |
| Done | Replace title-side tooltip pattern with inline page context and responsive helper text. |
| Done | Reorganize the main navigation into fewer top-level areas. |
| Done | Move detailed operational pages under `QA Operations`. |
| Done | Add GitHub Intake for PRs, issues, logs, and history. |
| Done | Add admin-only local GitHub intake record creation. |
| Done | Add QA Knowledge Base source-note intake and review pipeline counters. |
| Done | Add admin-only local QA knowledge note creation. |
| Done | Add Test Management link page pointing to the separate LiveLabs TMS project. |
| Done | Create section folders for GitHub Intake, Knowledge Base, and Test Management. |
| Done | Create `docs\v3-rework-plan.md`. |
| Done | Expand validation to cover V3 navigation and local intake workflows. |

## Linked TMS Tasks

| Status | Task |
| --- | --- |
| Done | Create separate `Projects\LiveLabs TMS` project. |
| Done | Capture TestLink/Xray comparison and implementation plan. |
| Done | Build local Redwood-styled TMS app on port `4193`. |
| Done | Add requirements, suites, cases, plans, builds, executions, coverage, defects, and reports. |
| Done | Add local requirement creation, test case creation, execution status updates, and audit events. |
| Done | Add unit tests, validation, build script, and browser smoke script. |
| Needs Review | Decide whether TMS should become independent, Xray-aligned, or hybrid. |

## V4 Test Management Rework Tasks

| Status | Task |
| --- | --- |
| Done | Rework QA Hub Test Management page into a useful pre-launch landing page. |
| Done | Rename launch action to `Open LiveLabs QA TMS`. |
| Done | Add projects/features to TMS. |
| Done | Add requirement documents for features/projects. |
| Done | Add requirement traceability matrix improvements. |
| Done | Add test suite creation and suite-plan linking. |
| Done | Add test plan creation and tests inside each plan. |
| Done | Add test case creation with steps and expected results. |
| Done | Add test execution creation and execution status updates. |
| Done | Add execution report generation. |
| Done | Expand unit tests and browser smoke coverage for the new flows. |

## Proposed MVP Build Tasks

| Status | Task |
| --- | --- |
| Ready | Define production auth and role enforcement contract. |
| Ready | Define canonical schemas for users, monitors, watchdog events, automation runs, and evidence links. |
| Ready | Implement persistent backend or approved storage. |
| Ready | Add read-only Jira issue ingestion for QA epics and tasks. |
| Ready | Add read-only automation run ingestion. |
| Ready | Add LiveLabs analytics data import and freshness checks. |
| Ready | Add health monitor scheduler or import path. |
| Ready | Add role-aware API tests and UI e2e tests. |

## Blocked Until Review

| Status | Task |
| --- | --- |
| Blocked | Any Jira write, comment, status move, or issue creation. |
| Blocked | Any production credential handling. |
| Blocked | Any notification integration that sends messages to users. |
| Blocked | Any claim that prototype mock data is production LiveLabs status. |
