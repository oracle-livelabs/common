# LiveLabs QA Hub Implementation Plan

Date: 2026-05-26
Planning mode: deep plan
Current version: v1 review draft

## Done For This Iteration

- Create the project folder and durable documentation.
- Create capability subdirectories for the first hub sections.
- Build a reviewable local Redwood-styled prototype.
- Validate auth gating, role permissions, CRUD helpers, project structure, and static build output.
- Return a report and wait for review before expanding the production architecture.

## Recommended Architecture Direction

Start with a front-end prototype to settle product shape, roles, and page taxonomy. After review, move to a service-backed architecture:

| Layer | First Draft | Production Candidate |
| --- | --- | --- |
| UI | Static Redwood-styled app | Oracle JET/Redwood or approved app framework |
| Auth | Seeded local demo accounts | Oracle internal auth/SSO |
| Data | Local seeded JSON and local storage | ORDS/API service with audit storage |
| Integrations | Mocked source records | Jira, CI/CD, LiveLabs analytics, WMS/TMS, LiveStack validation outputs |
| Audit | Browser-only demo logs | Server-side audit events and immutable evidence records |

## Phase Plan

### Phase 0: Product Review Prototype

1. Confirm section names, page taxonomy, and the left-navigation shell.
2. Review seeded user/admin flows.
3. Review watchdog and health monitor mental model.
4. Decide which pages must become MVP functional pages first.

### Phase 1: MVP Hub

1. Implement real authentication.
2. Add server-side role enforcement.
3. Persist users, QA items, monitor definitions, and run evidence.
4. Build read-only connectors for Jira, CI/CD, and analytics files.
5. Add dashboard summary cards and source freshness badges.

### Phase 2: QA Watchdog

1. Define monitor and alert schemas.
2. Add alert ingestion from automation, platform health, and manual QA entries.
3. Add triage workflow: New, Investigating, Mitigated, Resolved.
4. Add owner assignment, severity, evidence links, and report export.
5. Add Jira issue linking after write safety rules are approved.

### Phase 3: Health And Usage Intelligence

1. Add LiveLabs platform, LiveStack, content, and analytics health sources.
2. Add usage anomaly detection and stale-data warnings.
3. Add sprint readiness and aging blocker views.
4. Add scheduled report generation.

### Phase 4: Governance And Automation Expansion

1. Add notification routing.
2. Add admin-configurable thresholds.
3. Add historical trend and SLO pages.
4. Add data-quality checks for incoming sources.
5. Add export bundles for PM and leadership review.

## Data Model Draft

| Entity | Purpose |
| --- | --- |
| User | Login identity, role, status, team, last activity. |
| Role | Permission bundle such as user or admin. |
| WatchEvent | Alert/log record for a QA issue or signal. |
| Monitor | Health check definition with owner, cadence, threshold, and source. |
| AutomationRun | CI/CD or local QA run with status, artifact, and failure class. |
| QualityDomain | Platform, content, LiveStack, analytics, usage, sprint ops, reports. |
| EvidenceLink | Jira, CI, dashboard, report, log, screenshot, or dataset pointer. |
| Report | Generated or curated QA summary with filters and provenance. |

## Validation Strategy

- Unit tests for permission, auth, user CRUD, and watchdog mutation rules.
- Project validation script for required docs, section folders, and prototype files.
- Static build script to copy the review app into `app\dist`.
- Browser smoke check against the local app server.
- Future e2e tests for login, role switching, admin-only controls, alert CRUD, export, and source freshness.

## Risks And Stop Points

| Risk | Stop Point |
| --- | --- |
| Real auth path is not selected | Stop before production auth or backend implementation. |
| Jira writes are desired | Stop for explicit command review and approval. |
| LiveLabs production data access is needed | Stop for source ownership, credentials, and data handling rules. |
| Oracle JET is mandated | Stop and convert the prototype into the approved JET app structure. |
| Notification channels are requested | Stop before any system sends mail, chat, Jira comments, or alerts. |

## Immediate Next Step After Review

Choose the MVP production stack and the first two functional pages to implement beyond the prototype. Recommended first pair: QA Watchdog and Health Monitor.
