# LiveLabs QA Hub V2 QA Plan

Date: 2026-05-26
Status: draft for review

## Objective

Define the validation needed after the V2 feature rework is implemented.

## Plan QA

The V2 plan should be considered ready when it includes:

- Clear objective and scope.
- Prioritized feature backlog.
- Ordered implementation sequence.
- Explicit out-of-scope boundaries.
- Role and permission expectations.
- Demo-data and source-freshness rules.
- Concrete validation commands.
- Stop points for credentials, Jira writes, notifications, and production architecture.

## Output QA

After V2 implementation, verify these outputs exist:

| Output | Expected |
| --- | --- |
| Prototype app | Reworked Command Center, QA Watchdog, Health Monitor, Admin Console, Reports, and supporting pages. |
| State model | Seeded records for users, roles, alerts, monitors, health checks, evidence, sources, reports, and audit events. |
| Tests | Expanded unit tests and browser smoke tests. |
| Docs | Updated status report, v2 plan, backlog, QA plan, and validation report. |
| Screenshots | At least one admin and one user V2 screenshot under `resources/`. |

## Post-Implementation Tests

Run from:

```powershell
cd "C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs QA Hub\app"
```

Required commands:

```powershell
npm test
npm run validate
npm run build
npm run smoke
```

Additional static checks:

```powershell
$markerPattern = "TO" + "DO|TB" + "D|PLACE" + "HOLDER|FIX" + "ME"
rg -n $markerPattern "C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs QA Hub" -g "*.md" -g "*.js" -g "*.mjs" -g "*.css" -g "*.html"
rg -n "[ \t]$" "C:\Users\Lucian Brinzei\Documents\codex\Projects\LiveLabs QA Hub" -g "*.md" -g "*.js" -g "*.mjs" -g "*.css" -g "*.html"
```

## Test Cases To Add

| ID | Test | Expected |
| --- | --- | --- |
| V2-QA-001 | Admin login persists after browser refresh. | Admin remains signed in. |
| V2-QA-002 | Sign out clears session. | Login page appears. |
| V2-QA-003 | Active route persists after refresh. | Same page is restored. |
| V2-QA-004 | User cannot access Admin Console controls. | User sees profile/permissions only. |
| V2-QA-005 | Admin creates watchdog alert. | Alert appears, audit event is logged. |
| V2-QA-006 | Admin updates watchdog status. | Status changes, audit event is logged. |
| V2-QA-007 | User opens alert detail drawer. | Detail is visible, mutation controls are absent. |
| V2-QA-008 | Health check freshness rule marks stale source. | Stale badge appears. |
| V2-QA-009 | Demo data reset restores seed state. | Seed counts and default records return. |
| V2-QA-010 | Report export creates Markdown. | Output includes summary, findings, evidence, and demo disclaimer. |
| V2-QA-011 | Command Center action queue links to detail pages. | Clicking a queue item opens the relevant page/detail. |
| V2-QA-012 | Responsive layout keeps text readable on narrow viewport. | No overlapping buttons, cards, or table controls. |

## Accessibility And UX Checks

- Keyboard can reach navigation, tabs, forms, filters, drawers, and buttons.
- Focus state is visible.
- Buttons have clear accessible labels.
- Tooltips or help content do not block critical controls.
- Table metadata remains at readable size.
- Status is not communicated by color alone.

## Security And Safety Checks

- No real credentials in code, docs, screenshots, or local storage examples.
- No Jira write commands in scripts.
- No outbound notification code.
- Demo state is clearly labeled as local prototype data.
- Role checks are tested but not described as production security.

## Review Gate

Do not start production backend, SSO, Jira write, or notification integration work until V2 prototype review is approved.
