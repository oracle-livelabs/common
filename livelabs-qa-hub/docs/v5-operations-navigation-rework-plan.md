# LiveLabs QA Hub V5 Operations Navigation Rework Plan

Date: 2026-05-26
Status: implemented in V6 dynamic operations pass

## Problem

The QA Operations page is too cluttered. It presents every capability as a peer card and does not give users a way to navigate back from subcategories or move sideways between related operational views.

The next version should treat QA Operations as a workspace with clear hierarchy, breadcrumbs, sibling navigation, and related actions.

## UX Goals

- Make the QA Operations landing page scannable.
- Group capabilities by user task instead of listing every section as a card.
- Provide explicit back navigation from subcategory pages.
- Provide sibling navigation between subcategories.
- Preserve context when moving from one operations page to another.
- Keep the left nav clean while still allowing deep links.

## Proposed IA

Top-level nav remains:

- Command Center
- QA Operations
- GitHub Intake
- Knowledge Base
- Test Management
- Reports
- Admin Console

QA Operations internal groups:

| Group | Capabilities |
| --- | --- |
| Monitor And Triage | QA Watchdog, Health Monitor |
| Evidence And Automation | Automation Runs, GitHub Intake |
| Domain QA | LiveStack QA, Platform And Content, Usage Metrics, Sprint Ops |
| Test And Release | Test Management, Reports |

## Operations Landing Page

Replace large repeated cards with:

1. Compact overview:
   - Active alerts.
   - Risk/stale checks.
   - Failed or blocked evidence.
2. Grouped navigation bands:
   - Each group has 2 to 4 compact rows.
   - Each row shows name, one-line purpose, count/status, and Open action.
3. Recent activity:
   - Latest Watchdog event.
   - Latest failed automation run.
   - Latest stale health source.
4. Suggested next actions:
   - Open active alert.
   - Review stale source.
   - Open linked TMS plan if available.

## Subpage Navigation Pattern

Every QA Operations subpage should show:

```text
QA Operations / Health Monitor
[Back to QA Operations] [Previous: QA Watchdog] [Next: Automation Runs]

Sibling nav:
QA Watchdog | Health Monitor | Automation Runs | LiveStack QA | Platform And Content | Usage Metrics | Sprint Ops
```

The pattern should be above the page content and should collapse cleanly on mobile.

## Route Model

Use stable deep routes:

```text
operations
operations/watchdog
operations/health-monitor
operations/automation-runs
operations/livestack
operations/platform-content
operations/usage-metrics
operations/sprint-ops
```

For the current static app, these can map to local view IDs. In a real router, they should become path routes.

## Object Links Across QA Hub

QA Operations should link to object detail pages where possible:

- Watchdog event -> alert detail.
- Health check -> source/evidence detail.
- Automation run -> run/evidence detail.
- GitHub item -> PR/issue detail.
- TMS item -> linked requirement/test/plan/run detail.

## Visual Design Notes

- Keep the page operational and compact.
- Use flat Redwood cards with 8px radius or less.
- Prefer grouped rows and slim panels over many large cards.
- Use Oracle Bark for the shell and Oracle Red only for primary actions/risk accents.
- Avoid decorative hero layouts.
- Use badges only for status and priority.
- Make navigation controls stable across desktop and mobile.

## Implementation Plan

1. Define operations registry:
   - id,
   - label,
   - group,
   - route,
   - description,
   - status/count selector,
   - previous/next order.
2. Replace `renderOperationsHub()` card grid with grouped navigation bands.
3. Add `renderOperationsChrome(activeOperationId)` for breadcrumbs/back/sibling nav.
4. Wrap all operations subpages with the chrome.
5. Update route persistence to support nested operations routes.
6. Add browser smoke checks:
   - Operations landing renders groups.
   - Open Health Monitor.
   - Back to QA Operations.
   - Next/previous links work.
   - Reload preserves subpage route.
7. Add responsive checks through headless screenshot smoke.

## Acceptance Criteria

- QA Operations landing no longer appears as a flat wall of cards.
- Users can navigate back from any subpage without using browser back.
- Users can move sideways between QA Operations subpages.
- Breadcrumb always shows current location.
- Mobile view does not overflow.
- Browser smoke validates the navigation path.

## Deferred

- Real counts from backend APIs.
- Cross-app object routing to TMS detail pages.
- User-customizable pinned operations.

## Implementation Notes

Implemented on 2026-05-26 in the static prototype. See `docs\v6-dynamic-operations-and-tms-report.md` for validation results and current review server details.
