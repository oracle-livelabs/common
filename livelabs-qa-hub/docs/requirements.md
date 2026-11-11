# LiveLabs QA Hub requirements

Updated 4 November 2026. This iteration integrates QA TMS into the main Hub rather than linking to a separate default interface.

## Purpose

Connect QA planning, test readiness, bug triage, and requirements to source-backed framework evidence. Distinguish what the team plans or marks complete from what an execution actually observed.

## Pages and hierarchy

1. QA dashboard: current test collection, setup guards, open findings, plans, and dated run evidence.
2. QA work: local task Board, List, and Roadmap.
3. Tests: current automation inventory, historical-only tests, manual tests, and workflow.
4. Bugs & findings: triage, confirmation, progress, retest, and closure.
5. Test plans: editable test membership, plan status, and independent workflow/result counts.
6. Requirements: expected behavior and explicit test coverage links.
7. Automation runs: saved run history; Live Jenkins Reports remain unavailable.
8. PAR Links: measured, broken, unverified, and unavailable coverage states.
9. On-Call: existing synthetic/private review flow; support data remains in memory.
10. Repositories: local checkout inventory, not a live PR queue.
11. Sources & workspace: availability, backup, and legacy entry points.

## UI and behavior

Use the reviewed Asana patterns with Oracle Sans, Bark navigation, warm surfaces, compact status labels, view tabs, and a side detail panel. Boards support drag-and-drop and keyboard/touch status editing. Provide search, filters, sorting, counts, empty states, and responsive layouts without page-level horizontal overflow.

Link tests, bugs, plans, requirements, and runs by stable identity. Local manual outcomes require evidence. A test's workflow completion must never change its recorded automated outcome, and a later pass must not silently close a bug.

## Source contract

Collect Playwright test names using list-only mode. Read saved run summaries through a minimized projection. Keep collection/setup guards, historical unmatched identities, and manual records distinct. Catalog guard cases do not establish expanded catalog coverage.

Normalize only the known old domain/purpose path order when matching historical evidence. Do not fuzzy-match titles across unrelated sources. Select the final retry per test/browser/run; retain browser distinctions. Deduplicate findings by test identity, browser, and classification, with multiple run occurrences.

Show source timestamps and stale labels; do not infer current health from the September saved runs. Missing sources yield unavailable states, never obsolete seed data. PAR not-measured is not healthy. Contacts, access URLs, raw errors, and attachments do not enter the planning projection or static assets.

## Roles And Permissions

This iteration is a loopback-only local development workspace. The earlier demo login was a presentation mechanism, not production authentication; it remains in the legacy Hub. Production identity, authorization, shared state, and authenticated private reviewer access are not implemented in this local redesign.

The server accepts read-only local requests and exposes no test-execution or external-write endpoint. Local owners and statuses are not production authorization controls.

## Persistence and delivery

Browser-local workflow edits use a separate shared key on port 4192. Preserve previous Hub, visual-prototype, and TMS storage. The TMS default entry resolves to the Hub origin; the old TMS stays at port 4193 `/legacy.html` for existing records. Do not silently treat old demo records as current framework evidence.

Build both projects. Validate data reconciliation, immutability, linked-object workflows, reload/refresh persistence, unavailable sources, keyboard behavior, mobile layout, and retained legacy entry points. No publication or deployment is part of this request.

## Objectives

Define the QA Hub pages, roles, source contract, persistence behavior, and validation scope.

## Estimated Time

Estimated Time: About 15 minutes to review the product requirements.

## Acknowledgements

The requirements preserve the existing TMS entry points and distinguish imported evidence from browser-local workflow state.
