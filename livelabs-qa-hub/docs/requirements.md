# LiveLabs QA Hub Requirements

Date: 2026-05-26
Status: V3 draft for review

## Objective

Create a LiveLabs QA Hub that gives PM, QA, content, platform, and LiveStack stakeholders one operational view of quality health, issues, logs, usage signals, ownership, and follow-up work across the LiveLabs ecosystem.

## Background

The seed Jira epic `LDA-1492` scoped a LiveLabs QA health monitoring solution. The scope is now expanded into a broader hub. Health monitoring remains a core page, but the hub also needs watchdog-style issue flagging, user roles, account management, CRUD-capable work queues, GitHub intake, reviewed knowledge sources, usage and sprint metrics, reports, a linked TMS, and future integrations with Jira, CI/CD, LiveLabs data, WMS/TMS, and LiveStack QA sources.

## Personas

| Persona | Needs |
| --- | --- |
| QA admin | Configure monitors, manage users, triage alerts, update issue ownership, publish reports. |
| QA user | View health, inspect logs, follow assigned issues, export evidence, read reports. |
| PM/content owner | Understand workshop, sprint, usage, and content quality risks. |
| Platform owner | See service health, regression failures, release blockers, and incident patterns. |
| LiveStack owner | Track LiveStack guide, bundle, runtime, and validation issues. |
| Test lead | Design tests, track executions, review coverage, and connect defects to QA evidence. |

## Roles And Permissions

| Capability | User | Admin |
| --- | --- | --- |
| Log in and view dashboard | Yes | Yes |
| View QA Watchdog alerts and logs | Yes | Yes |
| Create or edit watchdog records | No | Yes |
| Acknowledge or resolve alerts | No | Yes |
| View health monitor status | Yes | Yes |
| Configure health checks | No | Yes |
| View usage, sprint, and reports pages | Yes | Yes |
| Export reports | Yes | Yes |
| View GitHub intake and QA knowledge | Yes | Yes |
| Add GitHub intake or knowledge notes | No | Yes |
| Manage users, roles, and account status | No | Yes |

## Functional Requirements

### Authentication

- The hub must show a login page before the application shell.
- The first draft must include seeded `user` and `admin` accounts.
- The production version must support a real identity provider or an approved Oracle internal auth path.
- The UI must show the active role and enforce role-based actions.

### User And Account Management

- Admins can create, update, disable, and remove users.
- Users can view their own account profile and permissions.
- Disabled users cannot authenticate.
- Account changes must be auditable in the production version.

### Hub Navigation

- The first design draft uses a left-side navigation menu.
- V3 top-level navigation must include: Command Center, QA Operations, GitHub Intake, Knowledge Base, Test Management, Reports, and Admin Console.
- QA Operations must provide launchers for QA Watchdog, Health Monitor, Automation Runs, LiveStack QA, Platform And Content QA, Usage Metrics, and Sprint Ops.
- Each section must be deep-linkable in the production version.

### QA Watchdog

- Provide a Datadog-like operational page for quality alerts, logs, monitors, severity, ownership, status, and recent events.
- Admins can create alert records, assign owners, and change status.
- Users can inspect alerts but cannot mutate records.
- Alerts must preserve enough evidence to support follow-up Jira or sprint work.

### Health Monitor

- Show current health for LiveLabs platform, content publishing, LiveStack, analytics, CI/CD automation, and sprint process signals.
- Show status, latency/freshness, owner, evidence source, and next check.
- Production checks should support poll-based and event-based inputs.

### Automation Runs

- Show latest regression, smoke, accessibility, link, content validation, and browser checks.
- Capture run status, source branch, environment, failure class, artifact links, and retry state.
- Connect failures to watchdog alerts when thresholds are crossed.

### LiveStack QA

- Track LiveStack bundle readiness, guide variants, local runtime status, Podman/container checks, ORDS/API checks, and documentation evidence.
- Connect LiveStack failures to content and platform risk views.

### Platform And Content QA

- Track LiveLabs platform release health, workshop content validation, broken links, stale metadata, disabled workshop rules, sprint/content governance, and WMS/TMS process health.
- Distinguish published content issues from source data issues.

### Usage Metrics

- Show workshop starts, sprint usage, declining/at-risk workshops, adoption by category, and usage anomalies.
- Support future joins against existing LiveLabs analytics outputs.

### Sprint Ops

- Track QA tasks, sprint procedure compliance, owner response, stale blockers, Jira alignment, and readiness gates.
- Provide a queue for high-risk or aging work.

### Reports

- Provide executive summaries, QA exception lists, release-readiness reports, automation failure summaries, and trend exports.
- Reports must separate confirmed facts from inferred or stale data.

### GitHub Intake

- Track repository-driven QA work across PRs, issues, validation logs, and review history.
- Admins can add local intake records in the prototype.
- Production must start read-only unless writeback is approved.
- Repeated GitHub failures should connect to Watchdog alerts and TMS execution evidence.

### QA Knowledge Base

- Provide a NotebookLM-style intake lane for files, links, research notes, and reviewed decision records.
- Sources must be reviewed before being promoted into QA rules, TMS requirements, or reports.
- Prototype source notes are local only.
- Production must support source provenance, duplicate detection, review status, and promotion history.

### Test Management

- The QA Hub links to a separate LiveLabs TMS project.
- The TMS owns requirements, test repository, plans, builds, executions, coverage, defects, and TMS reports.
- QA Hub records should link to TMS records where relevant: Watchdog alert to test case, PR to plan/execution, Knowledge Base note to requirement.

## Non-Functional Requirements

- Redwood-aligned UI with Oracle Sans, Oracle Red, Oracle Bark, neutral surfaces, and documented functional link colors.
- Responsive layout for desktop and review on narrow screens.
- Clear permission feedback without exposing unavailable controls as working actions.
- Accessible labels, keyboard navigation, visible focus states, and adequate contrast.
- Production design must avoid storing secrets in browser storage.
- Data integrations must support provenance, freshness, owner, and confidence.

## Initial Data Domains

| Domain | Example Signals |
| --- | --- |
| Jira | QA epics, incidents, sprint tasks, owners, status, comments. |
| CI/CD | Playwright runs, smoke tests, lint/typecheck, build failures, artifacts. |
| LiveLabs Analytics | Workshop and sprint usage, disabled content, QA exceptions, replacement candidates. |
| LiveStack | Bundle checks, app runtime, guide validation, container status. |
| Platform | Login, catalog, search, workshop launch, CDN/static content, APEX flows. |
| WMS/TMS | Workshop metadata, publishing status, testing process gates. |
| GitHub | Pull requests, issues, review logs, CI links, repository history. |
| Knowledge Sources | Reviewed files, links, source notes, decisions, and promotion status. |

## Acceptance Criteria For First Draft

- Project folder exists under `Projects\LiveLabs QA Hub`.
- Requirements, implementation plan, Jira source notes, task list, and validation report exist.
- Section folders exist for the major QA hub capabilities.
- Prototype shows login first.
- Demo `user` and `admin` accounts work.
- Admin role can perform local account and watchdog CRUD actions.
- User role can view hub content but cannot perform admin-only mutations.
- Prototype uses Redwood-aligned colors and Oracle Sans assets copied from the active Redwood Creator skill.
- Local validation and tests pass.

## Open Questions

1. Should the production implementation be Oracle JET, APEX, ORDS-backed full stack, React/Vite prototype hardened later, or another approved stack?
2. Which internal identity provider should back real authentication?
3. Which LiveLabs analytics datasets should be considered authoritative for usage and content risk?
4. Should Jira remain the system of record for QA items, or should the hub own its own incident model and sync with Jira?
5. What notification channel is expected first: email, Slack/Teams, Jira comments, Confluence report, or all of these later?
