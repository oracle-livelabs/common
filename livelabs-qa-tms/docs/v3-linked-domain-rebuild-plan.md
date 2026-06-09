# LiveLabs QA TMS V3 Linked Domain Rebuild Plan

Date: 2026-05-26
Status: phase 1 detail-route slice implemented

## Why This Rebuild Is Needed

The current prototype has useful seeded entities, but the user experience still behaves like a table viewer. A proper test management system must behave like a linked application: each requirement, test case, suite, test plan, execution, defect, and evidence record must be addressable, clickable, editable, auditable, and visible in context from related records.

The next version should rebuild the app around a relationship graph and routeable object detail pages rather than adding more summary tables.

## Research Basis

Patterns to reuse from TestLink:

- Test Project as the top-level quality scope.
- Requirement documentation and requirement-to-test-case relationships.
- Test Specification as a tree of test suites and test cases.
- Test Plans as execution scopes built from selected test cases.
- Builds as execution targets.
- Tester assignment and priority/risk at plan scope.
- Requirement-based reports where requirement health derives from related test results.
- Caution around deleting tests from plans after results exist.

Patterns to reuse from Xray:

- Tests, Test Plans, Test Executions, and Test Runs as distinct but linked objects.
- Test Runs as contextual execution instances of Tests.
- Test Run detail must preserve execution context, evidence, defects, environment, assignee, and status.
- Warnings when Test Executions include tests that are not in associated Test Plans.
- Reports should show Test, Test Execution, Test Plan, execution date, status, defects, and execution owner.

## Core Product Principle

Every visible ID is a link.

Examples:

- Clicking `REQ-001` opens the requirement detail page.
- Clicking `TC-001` opens the test case detail page.
- Clicking `TP-2026-05` opens the test plan detail page.
- Clicking `EX-001` opens the execution detail page.
- Clicking a linked defect opens the defect detail page.

Each detail page must show:

- record fields,
- editable form,
- related records,
- inbound and outbound links,
- history/audit,
- permitted actions,
- safe delete/archive behavior.

## Target Domain Model

### Core Entities

| Entity | Purpose | Stable ID Example |
| --- | --- | --- |
| Project | Feature/product quality scope. | `PRJ-LIVELABS-SEARCH` |
| Requirement Document | Versioned source document for a feature/project. | `RD-SEARCH-001` |
| Requirement | Requirement under test. | `REQ-001` |
| Test Suite | Test organization unit under a project. | `TS-PLATFORM-SMOKE` |
| Test Case | Reusable test specification. | `TC-001` |
| Test Case Version | Immutable test content snapshot used by executions. | `TC-001:v3` |
| Test Step | Ordered test step with expected result. | `STEP-001` |
| Test Plan | Planned scope for release/sprint/feature testing. | `TP-2026-05` |
| Plan Item | Test case included in a plan with priority/owner. | `TP-2026-05:TC-001` |
| Execution Cycle | A run cycle for a plan/build/environment. | `CYC-0526-R1` |
| Test Run | Execution instance of a test case version. | `RUN-001` |
| Step Result | Step-level execution result. | `RUN-001:STEP-001` |
| Defect Link | Defect associated with requirement/test/run. | `BUG-001` |
| Evidence | Attachment, link, log, screenshot, or note. | `EV-001` |
| Audit Event | Immutable change/event record. | `AUD-001` |

### Relationship Tables

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| Project -> Requirement Document | 1:n | A project can have multiple requirement documents. |
| Requirement Document -> Requirement | 1:n | Requirements inherit project context through the document. |
| Requirement <-> Test Case | n:n | A test can cover multiple requirements; a requirement can need multiple tests. |
| Project -> Test Suite | 1:n | Suites organize test cases by feature/domain. |
| Test Suite -> Test Case | 1:n or n:n | Start 1:n, allow move/copy later. |
| Test Case -> Test Case Version | 1:n | Executions must point to immutable versions. |
| Test Plan -> Test Suite | n:n | Plans can include suites. |
| Test Plan -> Test Case | n:n through Plan Item | Plan membership stores priority, owner, status, risk. |
| Test Plan -> Execution Cycle | 1:n | Multiple cycles per release/build. |
| Execution Cycle -> Test Run | 1:n | Runs are the executable records. |
| Test Run -> Step Result | 1:n | Enables step-level results. |
| Test Run -> Evidence | 1:n | Evidence belongs to execution context. |
| Test Run -> Defect | n:n | One run may expose multiple defects; one defect may affect multiple runs. |

## Route Architecture

Use routeable object views instead of table-only navigation.

```text
/projects
/projects/:projectId
/requirement-documents/:documentId
/requirements/:requirementId
/test-suites/:suiteId
/test-cases/:testCaseId
/test-cases/:testCaseId/versions/:versionId
/test-plans/:planId
/test-plans/:planId/items/:testCaseId
/execution-cycles/:cycleId
/test-runs/:runId
/defects/:defectId
/evidence/:evidenceId
/traceability
/reports
```

## Detail Page Pattern

Each object detail page should use the same Redwood-aligned anatomy:

1. Header: ID, title, status, owner, primary actions.
2. Relationship strip: parent, children, linked requirements/tests/plans/runs/defects.
3. Main editable form: fields for the current object.
4. Context tabs:
   - Overview
   - Linked Records
   - Execution History
   - Evidence
   - Audit
5. Side panel: quick actions and quality warnings.

## Required CRUD Behavior

### Create

- Create project.
- Create requirement document under project.
- Create requirement under requirement document.
- Create suite under project.
- Create test case under suite.
- Create test steps inside test case.
- Create test plan for project/release.
- Add suites/tests to test plan.
- Create execution cycle from a plan.
- Create test runs from plan items.
- Add evidence and defect links to runs.

### Read

- All table IDs link to detail pages.
- Detail pages show inbound and outbound links.
- Each record shows latest status and derived status.
- Traceability view supports requirement-first and test-first modes.

### Update

- Edit all record fields on detail pages.
- Edit links without losing history.
- Update execution and step statuses inline.
- Update owner, priority, risk, and status.
- Create a new test case version when changing executable content after runs exist.

### Delete And Archive

- Prefer archive over hard delete.
- Block delete if a record has execution history.
- Allow removing a test from a plan only before execution, or archive the plan item after execution.
- Keep audit history for all mutation events.

## Dynamic Link Rules

| Source | Link Behavior |
| --- | --- |
| `REQ-*` | Opens requirement detail with linked tests, plans, runs, defects, and coverage. |
| `TC-*` | Opens test case detail with requirements, suite, plan memberships, versions, runs, and defects. |
| `TP-*` | Opens test plan detail with suites, test list, assignments, cycles, coverage, and run status. |
| `RUN-*` | Opens execution detail with test version snapshot, steps, status, evidence, assignee, defects. |
| `BUG-*` | Opens defect detail with affected requirements, tests, runs, and source system link. |

## TMS Page Rebuild

### Overview

Replace static KPI cards with a cross-linked status board:

- Active projects.
- Plans in progress.
- Requirements without tests.
- Tests not in any plan.
- Failed/blocked runs.
- Defects without linked requirement/test context.

### Projects

Show a project list plus focused project detail:

- requirement documents,
- requirements,
- suites,
- plans,
- executions,
- defects,
- coverage health.

### Requirements

Provide two modes:

- Requirement Document view: document details and child requirements.
- Requirement Traceability Matrix: requirement -> tests -> plans -> runs -> defects.

### Test Repository

Use a tree or master-detail layout:

- suite tree on the left,
- test list in the middle,
- selected test case detail/editor on the right.

### Test Plans

Use a plan detail view:

- plan metadata,
- included suites,
- included tests,
- missing test warnings,
- assignments,
- create execution cycle action.

### Test Execution

Use execution cycle and run detail views:

- select cycle,
- list test runs,
- click run ID to execute/edit,
- step-level result editor,
- evidence and defect panels.

### Reports

Replace generic report preview with linked reports:

- Requirement Coverage Report.
- Test Plan Progress Report.
- Test Runs List Report.
- Failed/Blocked Runs Report.
- Defect Traceability Report.

## QA Operations Rework Plan

The current QA Operations page is cluttered because it puts every operation card at the same level. Rebuild it into a navigation workspace.

### New QA Operations Structure

- Top: compact operations overview with three metrics.
- Middle: grouped navigation bands.
- Bottom: recent activity and action queue.

Groups:

| Group | Items |
| --- | --- |
| Monitor And Triage | QA Watchdog, Health Monitor |
| Evidence And Automation | Automation Runs, GitHub Intake |
| Domain QA | LiveStack QA, Platform And Content, Usage Metrics, Sprint Ops |
| Test And Release | Test Management, Reports |

### Subcategory Navigation

Every QA Operations subpage must show:

- breadcrumb: `QA Operations / Health Monitor`,
- Back to QA Operations button,
- Previous/next operation links,
- sibling subnavigation,
- related actions.

Suggested route model:

```text
/operations
/operations/watchdog
/operations/health-monitor
/operations/automation-runs
/operations/livestack
/operations/platform-content
/operations/usage-metrics
/operations/sprint-ops
```

## Implementation Phases

### Phase 1: Routing And Object Links

- Add route parser for object detail routes.
- Convert all visible IDs to buttons/links.
- Add selected-object state.
- Add generic detail shell.
- Add breadcrumbs and back links.

Validation:

- Click `REQ-001`, `TC-001`, `TP-2026-05`, and `RUN-001`; each opens its detail view.
- Browser reload preserves object route.

### Phase 2: Domain Model Normalization

- Add explicit relationship collections.
- Add test case versions.
- Add plan items.
- Add execution cycles and test runs.
- Add step results and evidence records.

Validation:

- Unit tests prove relationship traversal both directions.
- Deleting/archive rules protect records with history.

### Phase 3: Detail Editors And CRUD

- Build detail editors for requirement, test case, plan, run, defect.
- Add create/edit/archive actions.
- Add link/unlink controls.
- Add audit events for every mutation.

Validation:

- Smoke test creates requirement -> test case -> plan item -> execution cycle -> run -> defect/evidence.
- Detail pages show all linked records.

### Phase 4: QA Operations UX Rebuild

- Group operations cards.
- Add breadcrumbs and sibling navigation.
- Rename internal routes to `/operations/*`.
- Add back and related-work controls on each subpage.

Validation:

- User can navigate from QA Operations to any subpage, back, and sideways without browser back.
- Mobile layout does not overflow or bury navigation controls.

### Phase 5: Reports And Traceability

- Add linked requirement coverage report.
- Add linked test runs report.
- Add linked plan progress report.
- Add gaps report.

Validation:

- Report rows link back to the underlying objects.
- Reports match derived model counts.

## UX Acceptance Criteria

- No table ID is dead text.
- Every object has a detail page.
- Every detail page has edit controls.
- Every object shows linked records.
- Every linked record can be opened.
- QA Operations subpages have breadcrumbs, back navigation, and sibling navigation.
- Deleting records with execution history is blocked or converted to archive.
- Reports link to real objects.
- Browser refresh preserves the selected detail page.

## Recommended Immediate Build Slice

Build the smallest useful dynamic slice first:

1. Normalize TMS IDs and route parser.
2. Add detail page for `TC-*`.
3. Make all `TC-*` IDs clickable.
4. Add edit form for test case fields and links.
5. Add related lists: requirements, plans, runs, defects.
6. Add detail page for `REQ-*` and `TP-*`.
7. Add QA Operations breadcrumb/back/sibling navigation.

This slice directly addresses the user's review without overbuilding the whole system at once.

## Implementation Notes

Implemented the first linked-domain slice on 2026-05-26. The prototype now includes routeable detail/edit pages for core objects, clickable IDs across tables and relationship panels, relationship graph helpers, and browser smoke coverage for the `TC-001 -> REQ-001 -> TP-2026-05 -> EX-001` path. See `docs\v3-linked-domain-implementation-report.md` for validation details.
