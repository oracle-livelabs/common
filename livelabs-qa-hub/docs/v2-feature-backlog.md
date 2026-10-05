# LiveLabs QA Hub V2 Feature Backlog

Date: 2026-05-26
Status: draft for review

## Priority 0: Must Have For V2

| ID | Feature | User Value | Notes |
| --- | --- | --- | --- |
| V2-001 | Command Center action queue | Shows what needs attention first. | Implemented. |
| V2-002 | QA Watchdog tabs | Makes alerts, logs, monitors, and incidents easier to understand. | Implemented. |
| V2-003 | Alert detail drawer | Gives context without leaving the queue. | Implemented. |
| V2-004 | Health check table | Makes health monitor status auditable. | Implemented. |
| V2-005 | Source freshness badges | Prevents stale or demo data from looking authoritative. | Implemented. |
| V2-006 | Role-aware Admin Console | Groups admin controls in one clear location. | Implemented. |
| V2-007 | Local session and route persistence | Makes review flow smoother. | Implemented. |
| V2-008 | Local audit log | Shows what changed during demo review. | Implemented. |
| V2-009 | Demo data reset | Lets reviewers return to a known state. | Implemented. |
| V2-010 | Expanded smoke tests | Protects role gates and core flows. | Implemented. |

## Priority 1: Should Have For V2

| ID | Feature | User Value | Notes |
| --- | --- | --- | --- |
| V2-011 | Contextual help and tooltips | Clarifies what each metric or action means. | Keep concise; avoid tutorial-like page copy. |
| V2-012 | Data source catalog | Explains where signals will come from. | Jira, CI/CD, analytics, LiveStack, platform, WMS/TMS. |
| V2-013 | Evidence model | Links alerts and reports to proof. | Use mock links/placeholders in V2. |
| V2-014 | Report templates | Makes the Reports page useful. | Daily Health, Release Readiness, Automation Failures, Content Risk. |
| V2-015 | Local Markdown export | Creates reviewable outputs without backend. | Include demo/source disclaimer. |
| V2-016 | Monitor configuration mock | Shows how Datadog-like monitors would work. | Admin-only local form. |
| V2-017 | Usage anomaly drilldown | Makes usage metrics actionable. | Show trend, affected workshops, owner, suggested action. |
| V2-018 | Sprint Ops aging queue | Exposes stale QA work. | Mock Jira-like aging records. |

## Priority 2: Defer Unless Time Allows

| ID | Feature | User Value | Notes |
| --- | --- | --- | --- |
| V2-019 | Chart visualizations | Improves scanning for trends. | Use simple accessible visuals first. |
| V2-020 | Saved filters | Helps repeated review workflows. | Can wait until pages stabilize. |
| V2-021 | CSV export | Useful for PM review. | Markdown/JSON export first. |
| V2-022 | Notification mock center | Previews future alert routing. | Do not send real notifications. |
| V2-023 | Role expansion UI | Previews Viewer, QA Analyst, Domain Owner, Admin. | Keep enforcement simple in V2. |

## Explicitly Out Of Scope For V2

| Item | Reason |
| --- | --- |
| Real Jira writes | Requires explicit approval and command safety review. |
| Real credentials or SSO integration | Requires production architecture and security handling. |
| Real notification delivery | Could contact people or systems; keep as mock only. |
| Authoritative LiveLabs production claims | V2 data is demo/local unless real source integration is approved. |
| Full backend persistence | Plan separately if V2 review says prototype is ready for service-backed build. |

## Recommended Build Slice

Build V2 in three passes:

1. `Foundation`: state model, helpers, session/route persistence, audit log, source/freshness model.
2. `Operational Pages`: Command Center, QA Watchdog, Health Monitor, Admin Console.
3. `Evidence And Reports`: report templates, export, screenshots, validation updates.
