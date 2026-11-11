# LiveLabs TMS Implementation Plan

Date: 2026-05-26
Status: implemented local prototype

## Objective

Create a local LiveLabs Test Management Solution prototype linked to the QA Hub. The prototype should demonstrate requirements, test suites, test cases, test plans, builds, executions, coverage, defects, and reporting in one Redwood-styled operational UI.

## V1 Scope

1. Create separate project under `Projects\LiveLabs TMS`.
2. Build static local prototype with seeded and locally persisted data.
3. Include TestLink-style repository, plan, build, execution, and reporting concepts.
4. Include Xray-style Jira-native mapping and traceability concepts.
5. Add tests, validation, build, and browser smoke scripts.
6. Start local server on port `4193`.
7. Link from QA Hub Test Management page to the TMS.
8. Add local requirement creation, test case creation, execution status updates, audit events, and derived report output.

## Implemented V1 Workflows

| Workflow | Implemented Behavior |
| --- | --- |
| Test repository | View requirements, suites, and test cases; add local requirements and test cases. |
| Planning | View test plans and builds. |
| Execution | View executions and update local execution status. |
| Coverage | Derive requirement coverage from current local cases, executions, and defects. |
| Defects | Show Jira/Xray-ready defect links without writing to Jira. |
| Reports | Generate a local Markdown report from current local state. |
| QA Hub link | Sidebar links back to `http://127.0.0.1:4192`; QA Hub links forward to TMS on `4193`. |

## Implemented V2 CRUD Expansion

| Workflow | Implemented Behavior |
| --- | --- |
| Projects/features | Create local projects/features and update status. |
| Requirement documents | Create project-level requirement documents and update review status. |
| Requirements | Create requirements linked to requirement documents; update status; remove unlinked requirements. |
| Test suites | Create suites linked to projects; update status; remove unlinked suites. |
| Test cases | Create tests with requirement, suite, steps, expected result, type, priority, automation, and status; update status; remove tests with local cascade. |
| Test plans | Create plans linked to project, requirement document, and build; update status; remove plans. |
| Suite-plan links | Link and unlink suites from plans. |
| Tests inside plans | Add and remove test cases from plan scope. |
| Test execution | Create execution runs and update execution result status. |
| Traceability | Show document traceability and requirement traceability matrix. |
| Execution reports | Generate local Markdown report from plans, executions, and traceability. |

## Future Production Architecture

| Layer | Prototype | Production Candidate |
| --- | --- | --- |
| UI | Static Redwood-styled app | Oracle JET/Redwood, APEX, or approved frontend |
| Storage | Local seeded state | Oracle Database |
| API | None | ORDS APIs |
| Jira/Xray | Mock mapping | Read-only Jira first, write sync only after approval |
| Automation | Seeded import model | Playwright/CI import pipeline |
| Reports | Local preview | Stored report snapshots and exports |

## Data Model Draft

- Project/feature: `id`, `name`, `owner`, `status`, `release`, `description`
- Requirement document: `id`, `projectId`, `title`, `owner`, `version`, `status`, `summary`
- Requirement: `id`, `documentId`, `projectId`, `title`, `priority`, `source`, `status`
- Test suite: `id`, `projectId`, `name`, `owner`, `status`
- Test case: `id`, `projectId`, `suiteId`, `requirementId`, `title`, `type`, `priority`, `automation`, `status`, `steps`, `expected`
- Test plan: `id`, `projectId`, `requirementDocumentId`, `name`, `buildId`, `owner`, `suiteIds`, `scope`, `status`
- Build: `id`, `name`, `environment`, `status`
- Execution: `id`, `testCaseId`, `planId`, `buildId`, `assignee`, `status`, `evidence`, `runDate`
- Defect link: `id`, `testCaseId`, `executionId`, `title`, `system`, `status`, `severity`
- Audit event: `id`, `action`, `detail`, `timestamp`

## Stop Points

- Stop before Jira writes.
- Stop before GitHub API credentials.
- Stop before importing production test results.
- Stop before production auth/SSO.
- Stop before sending notifications.
