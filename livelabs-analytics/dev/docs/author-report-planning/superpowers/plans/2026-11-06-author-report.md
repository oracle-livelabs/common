# Author report implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline, then an independent final review.

**Goal:** Implement the approved compact author report and dashboard changes without changing ranking policy or recorded findings.
**Architecture:** Keep the current plain-JavaScript renderer and Python service. Add a sanitized evidence sidecar and shared baseline projection; reuse existing score blending and identities.
**Tech Stack:** Python standard library, JavaScript, existing CSS, unittest and CUA browser validation.
**Spec:** ../specs/2026-11-06-author-report-design.md (approved by user).

## Global constraints
- Keep existing blended scores, source/public inventories, manual decisions, priorities and finding occurrences unchanged.
- Use one public Score; retain performance/risk direction with an explicit context.
- All disclosures and menu default closed; matching requires exact run/record/check identity.
- No publication, new framework, new QA execution or invented evidence.
- Work in the approved current local project; preserve all dirty work in a task backup. No Git commits or cleanup of unrelated files. Existing user authorization covers implementing this plan inline.

## Review focus
- Missing/ambiguous/stale evidence must not transfer between checks.
- Access-bearing URLs and raw HTML must not leak through evidence or exports.
- Direct URLs, global search and risk/retirement links must show the correct score or N/A.
- Closed navigation must not receive focus; keyboard users must be able to exit.
- Partial reports, no QA report and unknown score inputs must not appear as clean or zero.

### Task 1 — Evidence and score projections
- [x] Back up touched inputs and record score/membership and QA-count baselines.
- [x] Add `dev/tests/test_author_reports.py`: exact/ambiguous/wrong-run matching; allowlisted content/URLs; 1036 Preview only; shared score parity.
- [x] Add `dev/scripts/author_reports.py`: `finding_key(id, issue)`, `normalize_evidence(issue)`, `build_evidence(raw)`, `enrich_merge(merge, sidecar, eligible_ids)`, `score_baselines(public)`.
- [x] Add `dev/scripts/build-author-reports.py` CLI to write public baseline data and private sanitized evidence sidecar; do not modify the applied snapshot.
- [x] Add sanitized evidence to the public API and future imports. Include the new runtime helper in service packaging; ensure baseline projection is included and freshness checked in release workflows.
- [x] Run Python tests and compare protected hashes/counts. Expected: unchanged records/scores and 786 unique exact evidence matches for current export.

### Task 2 — Shared navigation and table presentation
- [x] Add the closed menu drawer and keyboard/focus handling to the canonical shell and shared renderer; regenerate entrypoints.
- [x] Reorder cards; count distinct P1/P2/P3 affected items; remove public review-focus/QA-score columns and their column controls, retaining focus filtering inside Apply filters.
- [x] Use Score consistently, add score context to record links and compact emails; update validation contracts.
- [x] Verify table membership, sorting, score blending and clear filters after column removal.

### Task 3 — Search and author records
- [x] Consume generated baselines and existing QA blend in shared `recordScore(record, context)`; preserve URL context across copies, reload, back/forward and exports.
- [x] Replace nested clickable search cards with compact result rows and red Open record plus LiveLabs actions.
- [x] Render compact record header, one score, P1-first collapsed evidence groups, source locations and suggested next actions. Keep metadata/related records collapsed and preserve export structure.
- [x] Add bounded safe evidence rendering and honest unmatched/partial/no-report states; suppress duplicate score surfaces.

### Task 4 — Verification and handoff
- [x] Run all Python tests, JavaScript syntax and dashboard validator; preserve complete output in task artifacts.
- [x] Check dashboard, search, 3427 and 1036 records in CUA; check score context, matched/unmatched evidence, drawer keyboard behavior, closed defaults, buttons and overflow. Capture screenshots.
- [x] Obtain independent review of changed files; fix important findings with focused regression tests.
- [x] Leave current server at 127.0.0.1:4175 and report validation plus any remaining limits.

## Execution record
The approved design is implemented in-place because this is the user's current dirty local preview. A task backup and input hashes provide recovery without committing or replacing unrelated work. Detailed verification artifacts are kept under the task folder; this is an implementation artifact, not a memory-system update.

Verified implementation: see Tasks/analytics-author-report-2026-11-06/IMPLEMENTATION.md and checks.txt in the Codex workspace. Browser checks were focused smoke checks; the legacy full Playwright suite was not run. Static evidence publication remains a separate release step.

## Objectives

Record the implementation sequence, constraints, verification, and handoff for the Analytics author report.

## Estimated Time

Estimated Time: About 10 minutes to review this implementation plan.

## Acknowledgements

The plan reflects the local implementation and checks recorded in the project workspace; publication remains separate.
