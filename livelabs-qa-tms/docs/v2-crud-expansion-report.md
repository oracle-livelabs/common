# LiveLabs QA TMS V2 CRUD Expansion Report

Date: 2026-05-26
Status: implemented

## Objective

Expand the first-draft TMS prototype into a more useful TestLink-style local workspace for creating and managing feature/project testing.

## Implemented Capabilities

| Area | Implemented |
| --- | --- |
| Projects/Features | Create projects/features, update status, and view project-level QA counts. |
| Requirement Documents | Create requirement documents per project/feature, update status, and link requirements to documents. |
| Requirements | Create requirements, update status, delete unlinked requirements, and inspect requirement traceability. |
| Test Suites | Create suites per project, update suite status, and link suites to test plans. |
| Test Cases | Create tests with requirement, suite, steps, expected result, type, priority, automation, and status. |
| Test Plans | Create plans linked to project, requirement document, build, suites, and plan test membership. |
| Plan Test Management | Add tests to plans, remove tests from plans, link suites, and unlink suites. |
| Test Execution | Create execution runs and update execution status. |
| Execution Reports | Generate local Markdown reports from current execution and traceability state. |
| Traceability | Added document traceability and requirement traceability matrix views. |

## Boundaries

- Local seeded and browser-persisted demo data only.
- No Jira writes.
- No GitHub API calls.
- No credentials.
- No production source claims.

## Validation

- `npm test`: passed, 7 tests.
- `npm run validate`: passed.
- `npm run build`: passed.
- `npm run smoke`: passed.

## Proposed Next Rework

1. Add edit drawers for full record editing instead of status-only inline controls.
2. Add saved filters for project, plan, owner, execution status, and priority.
3. Add import support for Playwright/JUnit/Cucumber results.
4. Add test case versioning and requirement baseline snapshots.
5. Add execution cycles and run history per build.
6. Add role-based permissions once auth is introduced.

