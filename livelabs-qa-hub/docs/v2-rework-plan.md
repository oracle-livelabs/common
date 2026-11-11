# LiveLabs QA Hub V2 Rework Plan

Date: 2026-05-26
Status: implemented for live review
Planning mode: standard plan
Output mode: project artifact

## Objective

Turn the first prototype into a clearer, more operational second version that demonstrates real QA workflows: command-center triage, watchdog investigations, health monitor configuration, evidence handling, role-aware administration, and source-aware reporting.

## Current Understanding

- V1 is a local Redwood-styled prototype with seeded `admin` and `user` accounts.
- V1 validates login, role-gated account management, QA Watchdog CRUD for admin, and read-only behavior for users.
- V1 is intentionally demo-only and uses local seeded state.
- V2 should still avoid production credentials, outbound notifications, Jira writes, or authoritative LiveLabs data claims.

## V2 Product Direction

V2 should move from "screen tour" to "operational workflow prototype." The main improvement is not adding more pages. The main improvement is making each page answer:

1. What is wrong?
2. How do we know?
3. Who owns it?
4. What changed recently?
5. What action is allowed for my role?
6. What should happen next?

## Recommended V2 Scope

### 1. Command Center Rework

Rebuild the landing dashboard around priority queues rather than generic summary cards.

Planned improvements:

- Add an `Action Queue` for high severity watchdog events, stale owners, failed automation runs, and at-risk usage metrics.
- Add `Health By Domain` with platform, content, LiveStack, automation, usage, and sprint ops tiles.
- Add `Recent Evidence` showing latest CI, Jira, analytics, or manual QA source records.
- Add `Needs Decision` cards for items requiring admin or PM direction.
- Add page-level help text and compact tooltips so reviewers understand each metric.

Acceptance criteria:

- A reviewer can identify the top three QA risks within 30 seconds.
- Each KPI links or routes to the relevant detail page.
- Every card labels its data source and freshness.

### 2. QA Watchdog Rework

Make Watchdog the primary Datadog-like investigation surface.

Planned improvements:

- Split Watchdog into `Alerts`, `Logs`, `Monitors`, and `Incidents` tabs.
- Add filters for domain, severity, status, owner, and source.
- Add alert detail drawer with timeline, evidence, related automation run, source freshness, and recommended next action.
- Add status transitions with role gates.
- Add monitor definitions as demo records: cadence, threshold, source, owner, escalation policy.
- Add admin-only create/edit monitor flow.

Acceptance criteria:

- Admin can create an alert, update status, and attach evidence.
- User can inspect alert details but cannot mutate records.
- Monitor definitions explain why an alert exists.

### 3. Health Monitor Rework

Convert static health cards into configurable health checks.

Planned improvements:

- Add a table of health checks with status, score, freshness, owner, cadence, last run, next run, and evidence.
- Add domain drilldown for platform, content, LiveStack, automation, usage, and sprint ops.
- Add status rules: Operational, Watch, Risk, Unknown, Stale.
- Add stale-source warnings when freshness exceeds threshold.
- Add admin-only check configuration mock flow.

Acceptance criteria:

- A reviewer can see both current status and why that status was assigned.
- Stale data is visually distinct from passing or failing data.
- Admin-only configuration controls are hidden or disabled for users.

### 4. Role And Account Model Rework

Move beyond only `user` and `admin` in the planning model while keeping V2 implementation simple.

Planned roles:

| Role | Purpose |
| --- | --- |
| Viewer | Read dashboards, reports, and public evidence. |
| QA Analyst | Triage alerts, add notes, attach evidence. |
| Domain Owner | Own and update records for assigned domains. |
| Admin | Manage users, monitors, permissions, and system settings. |

V2 implementation can still ship with `user` and `admin`, but the UI should be designed so the later role expansion is clear.

Acceptance criteria:

- Account page explains permissions in plain operational language.
- Admin actions are grouped in a dedicated admin section.
- Role checks remain centralized in state logic and tests.

### 5. Session And State Behavior

Make demo state feel intentional and predictable.

Planned improvements:

- Keep local session persistence until explicit Sign out.
- Add a visible session indicator: active user, role, and local-demo mode.
- Add `Reset demo data` as an admin-only action.
- Add import/export of demo state as JSON for review handoff.
- Add route persistence so refresh returns to the active page.

Acceptance criteria:

- Refreshing the browser keeps the active session and current page.
- Sign out clears only the session, not necessarily demo data.
- Reset demo data is explicit and admin-only.

### 6. Admin Console Rework

Create a clearer admin surface instead of scattering admin controls.

Planned improvements:

- Add `Admin Console` page or grouped account/admin view.
- Sections: Users, Roles, Monitor Settings, Data Sources, Demo Data, Audit Events.
- Add local audit log for account changes, watchdog mutations, monitor edits, and data reset.
- Make admin actions visually distinct from general navigation.

Acceptance criteria:

- Admin can find all configuration-like controls in one place.
- User sees only profile and permissions summary.
- Audit events record local demo actions.

### 7. Data Source And Evidence Model

Introduce source-aware records even before real integrations.

Planned improvements:

- Add seeded source catalog: Jira, CI/CD, LiveLabs Analytics, LiveStack validation, Platform checks, WMS/TMS.
- Add evidence objects with type, title, source, timestamp, freshness, confidence, and link placeholder.
- Add confidence labels: Confirmed, Inferred, Stale, Needs Review.
- Add source freshness warnings across pages.

Acceptance criteria:

- Every alert, health check, automation run, and report has visible provenance.
- Mock data is clearly marked as demo data.
- No page implies production status.

### 8. Reports And Export Rework

Make Reports useful for leadership and PM review.

Planned improvements:

- Add report templates: Daily QA Health, Release Readiness, Automation Failures, Content Risk, LiveStack Readiness.
- Add filters: date range, domain, owner, severity, confidence.
- Add local export as JSON and Markdown.
- Add report preview with source freshness summary.

Acceptance criteria:

- Admin or user can generate a local demo report without external systems.
- Report includes summary, findings, evidence, and next actions.
- Exported report clearly states demo/source status.

## V2 Page Map

| Page | V2 Role |
| --- | --- |
| Command Center | Triage and executive overview. |
| QA Watchdog | Alert, log, monitor, and incident investigation. |
| Health Monitor | Domain health checks and source freshness. |
| Automation Runs | CI/CD and local QA evidence. |
| LiveStack QA | LiveStack guide, bundle, runtime, and validation readiness. |
| Platform And Content | Catalog, search, launch, metadata, WMS/TMS, and content QA. |
| Usage Metrics | Usage anomalies, sprint starts, adoption, and at-risk content. |
| Sprint Ops | Aging blockers, owner response, sprint QA gates, Jira alignment. |
| Reports | Review-ready summaries and exports. |
| Admin Console | Users, roles, sources, monitors, demo data, and audit. |

## Implementation Sequence

1. Refactor state model into separate seeded data groups: users, roles, permissions, alerts, monitors, health checks, evidence, sources, reports, audit events.
2. Add a small UI helper layer for tooltips, help text, status badges, freshness badges, and role-gated actions.
3. Rework Command Center around action queues and domain health.
4. Rework QA Watchdog into tabs and add alert detail drawer.
5. Rework Health Monitor into configurable check list and domain drilldowns.
6. Add Admin Console with users, roles, data sources, monitor settings, reset demo data, and audit log.
7. Add session/page persistence and demo-state import/export.
8. Add report templates and local Markdown/JSON export.
9. Expand tests and smoke coverage for the new workflow paths.
10. Refresh docs, screenshots, and status report.

## Validation Plan

- Unit tests for role permissions, session persistence, route persistence, audit events, reset data, monitor status rules, freshness labels, and report generation.
- Browser smoke tests for admin and user flows:
  - login
  - page refresh keeps session
  - route persistence works
  - admin can create/update alert
  - user cannot mutate alert or settings
  - admin can reset demo data
  - report export produces expected content
- Static validation for required docs, pages, source labels, and no unfinished task markers.
- Visual review against Redwood rules: flat operational cards, restrained color, Oracle Sans, readable table metadata, no marketing pictograms in app chrome.

## Risks And Stop Points

| Risk | Stop Point |
| --- | --- |
| Scope expands into real production integration | Stop before credentials, network writes, or source-system changes. |
| Jira writes are requested | Stop for explicit command review and confirmation. |
| Backend is required for v2 | Stop and create a production architecture plan before implementation. |
| Role model becomes security-sensitive | Stop before treating local role checks as production security. |
| Oracle JET compliance becomes mandatory | Stop and convert prototype structure to approved JET app conventions. |

## Recommended V2 Deliverables

- Updated prototype app with v2 page rework.
- Expanded test suite and browser smoke.
- `docs/v2-qa-plan.md`
- `docs/v2-feature-backlog.md`
- Updated `STATUS_REPORT.md`
- Updated screenshots under `resources/`

## Immediate Next Action

Review the implemented V2 prototype live. After review, decide whether V3 should stay static/demo for more product iteration or move to ORDS/Oracle Database, Oracle JET, APEX, or another approved production architecture.
