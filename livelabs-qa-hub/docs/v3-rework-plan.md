# LiveLabs QA Hub V3 Rework Plan

Date: 2026-05-26
Status: implemented local prototype

## Objective

Reduce navigation clutter, clarify the Command Center pattern, replace title-side tooltip behavior with responsive inline context, add GitHub intake, add a reviewed QA Knowledge Base, and link a separate LiveLabs TMS project.

## Product Decisions

- Rename the former Dashboard return action to `Command Center`.
- Keep the left navigation short and route detailed capability pages through `QA Operations`.
- Use inline page context and short helper text instead of fragile title-side tooltip controls.
- Keep all intake and knowledge actions local/demo-only until source ownership, credentials, and write rules are approved.
- Keep Test Management as a separate project so it can grow into a full TMS without crowding the QA Hub.

## Implemented V3 Scope

1. Navigation rework:
   - Command Center
   - QA Operations
   - GitHub Intake
   - Knowledge Base
   - Test Management
   - Reports
   - Admin Console

2. QA Operations consolidation:
   - QA Watchdog
   - Health Monitor
   - Automation Runs
   - LiveStack QA
   - Platform And Content
   - Usage Metrics
   - Sprint Ops

3. GitHub Intake:
   - PR, issue, and log queue.
   - History feed.
   - Admin-only local intake form.

4. QA Knowledge Base:
   - Notebook-style source intake concept.
   - Admin-only local source notes.
   - Review pipeline counters.
   - Human-review-first language.

5. Linked TMS:
   - QA Hub links to `http://127.0.0.1:4193`.
   - TMS owns requirements, test repository, plans, executions, coverage, defects, and TMS reports.

## Validation Plan

- Run QA Hub unit tests.
- Run QA Hub project validation.
- Build QA Hub static dist.
- Run headless browser smoke for auth, role gates, operations, GitHub intake, Knowledge Base, TMS link, reports, and session/route persistence.
- Run TMS unit tests, validation, build, and browser smoke separately.
- Restart both local servers and verify HTTP 200.

## Stop Points

- No Jira writes.
- No GitHub API writes or credentials.
- No real file uploads, embeddings, or external source processing.
- No production security claims.
- No notification sending.

## Recommended Next Version

- Decide production stack: Oracle JET/Redwood with ORDS APIs, APEX/ORDS, or service-backed app.
- Add read-only GitHub and Jira ingestion.
- Add canonical QA Knowledge Base review workflow with source metadata, duplicate detection, and promotion gates.
- Model QA Hub to TMS links: Watchdog alert to test case, PR to test plan, Knowledge Base source to requirement.
- Add role model beyond `user` and `admin`: Viewer, QA Analyst, Domain Owner, Admin.

