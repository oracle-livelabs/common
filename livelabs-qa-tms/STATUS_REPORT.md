# LiveLabs TMS Status Report

Date: 2026-05-26
Status: ready for review, V2 CRUD expansion implemented

## Summary

Created a separate `LiveLabs TMS` project linked from the QA Hub. The prototype combines TestLink-style repository/planning/execution concepts with Xray-style traceability and Jira-ready defect links. The second pass expands it into a project/feature-based QA TMS with requirement documents, suite-plan links, plan test membership, execution creation, and execution reporting.

## Project Path

```text
C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs TMS
```

## Local Review URL

```text
http://127.0.0.1:4193
```

Current local server:

```text
PID 3588 on http://127.0.0.1:4193
```

## Implemented Capabilities

| Area | Implemented |
| --- | --- |
| Overview | KPI snapshot and product direction. |
| Projects | Feature/project scope creation and local status management. |
| Requirements | Requirement document creation, requirement creation, and traceability matrix. |
| Test Repository | Suite creation, test case creation, status updates, and removals. |
| Test Plans | Plan creation, suite linking, test assignment, plan test membership, and plan status. |
| Test Execution | Execution creation, status updates, and removals. |
| Traceability | Document and requirement traceability across tests, plans, executions, and defects. |
| Defects And Links | Jira/Xray-ready local defect mappings. |
| Execution Reports | Local Markdown report preview from current state. |
| QA Hub Link | Sidebar link back to the QA Hub on port `4192`. |

## Validation Results

| Command | Result |
| --- | --- |
| `npm test` | Passed: 7 tests, 7 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed |
| `npm run smoke` | Passed |
| HTTP probe | Passed: `http://127.0.0.1:4193` returned `200` |

Browser smoke screenshot:

```text
C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs TMS\resources\tms-browser-smoke.png
```

## Boundaries

- No Jira writes.
- No GitHub API calls.
- No credentials.
- No notifications.
- Local seeded and persisted demo state only.

## Proposed Improvements

1. Decide whether the long-term direction is independent TMS, Xray-aligned Jira workflow, or hybrid.
2. Add edit drawers for full CRUD editing beyond inline status updates.
3. Add read-only imports from QA Hub knowledge notes, Watchdog alerts, and GitHub PR records.
4. Add automation result import for Playwright/JUnit/Cucumber.
5. Add role-aware approval workflow for requirements and test cases.
6. Add evidence attachments after storage and security model are selected.

## V3 Linked Domain Implementation Completed

Date: 2026-05-26
Status: ready for review

This pass changes the TMS from table-heavy CRUD into a linked object application.

| Area | Implemented |
| --- | --- |
| Object routes | Added detail routes for project, requirement document, requirement, suite, test case, plan, execution, and defect records. |
| Clickable IDs | Converted visible IDs in tables and relationship panels into links. |
| Requirement detail | Editable requirement fields plus linked tests, plans, executions, defects, and audit history. |
| Test case detail | Editable test content, suite linkage, requirement linkage, automation/status metadata, related plans, executions, defects, and audit history. |
| Test plan detail | Editable plan metadata, linked suites, plan tests, executions, defects, and audit history. |
| Execution detail | Editable execution context, status, assignee, evidence, linked test case, linked requirement, linked plan, and defects. |
| Relationship helpers | Added tested helpers for requirement, test case, plan, and execution relationship traversal. |

Validation:

| Command | Result |
| --- | --- |
| `npm test` | Passed: 9 tests, 9 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed |
| `npm run smoke` | Passed |
| HTTP probe | Passed: `http://127.0.0.1:4193` returned `200` |

Current local server:

```text
PID 26132 on http://127.0.0.1:4193
```

Implementation report:

```text
docs\v3-linked-domain-implementation-report.md
```

## V4 Link Management And Safe Lifecycle Completed

Date: 2026-05-26
Status: ready for review

| Area | Implemented |
| --- | --- |
| Requirement linking | Requirement detail can link existing tests into coverage. |
| Test plan membership | Test case detail can add the test to a plan and remove safe memberships. |
| Plan scope management | Plan detail can link suites, add tests, unlink safe suites, and remove safe tests. |
| Execution defect links | Execution detail can create a local Jira-ready defect link. |
| Safe lifecycle | Records with execution or defect history are retired or archived instead of hard-deleted. |
| Hash routing | Direct object hash routes work from QA Hub cross-links and within the loaded app. |

Validation:

| Command | Result |
| --- | --- |
| `npm test` | Passed: 11 tests, 11 passed |
| `npm run validate` | Passed |
| `npm run build` | Passed |
| `npm run smoke` | Passed |

Current local server:

```text
PID 24232 on http://127.0.0.1:4193
```

Implementation report:

```text
docs\v4-link-management-safe-lifecycle-report.md
```
