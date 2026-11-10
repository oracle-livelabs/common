# Integrated QA Hub and TMS — v2

Date: 4 November 2026. Local implementation; no publication or deployment.

## Delivered behavior

The reviewed Asana-style interface is now the main QA Hub entry at `http://127.0.0.1:4192/`. A shared sidebar connects Dashboard, QA Work, Tests, Bugs & Findings, Test Plans, Requirements, Automation Runs, PAR Links, On-Call, Repositories, and Sources & Workspace.

Test and bug boards support drag-and-drop, Board/List views, search, domain/outcome/owner/origin filters, sorting, and side details. Test workflow and recorded execution results remain separate. Tasks retain monthly planning, including date changes by dragging between months.

Users can create manual tests, record manual outcomes with evidence, log linked bugs, add notes, build/edit plans from selected or filtered tests, and link requirements in both directions. A bug can remain ready for retest even after later pass evidence arrives; local closure requires a deliberate workflow change.

Both projects use the Hub's canonical browser origin. The TMS launcher at port 4193 opens the Hub Tests page and can start the Hub if needed. The old Hub and TMS interfaces remain at `/legacy.html` on their original ports, preserving old browser storage. Existing TMS object-hash links resolve to the retained legacy records. The original design prototype remains at `/prototype.html`.

## Ownership and architecture

| Component | Owning project | Responsibility |
| --- | --- | --- |
| `app/public/workspace.mjs`, `workspace-ui.mjs`, `workspace.css` | QA Hub | Integrated shell, dashboard, views, detail panels, and interaction wiring |
| `app/public/workspace-model.mjs` | QA TMS | Local workflow overlays, manual records/outcomes, relationships, and plans |
| `app/scripts/automation-adapter.mjs` | QA TMS | Read-only framework collection and report projection |
| `/api/local/tms` | Hub server | 60-second cache and explicit refresh of the TMS projection |
| `/tms/workspace-model.mjs` | Hub server | Allowlisted serving of the shared TMS browser model |
| Existing local readers and on-call modules | QA Hub | Saved reports, PAR status, repository inventory, and protected/synthetic review boundaries |

The Hub static build copies the TMS model into `dist/tms`. Static hosting has no local reader and renders unavailable evidence states. No report JSON, contacts, private support data, or credentials are copied into public assets.

The existing framework files were inspected but not changed. Refresh invokes Playwright with `test --list --reporter=json --project=chromium`; it does not launch test browsers or run the framework suites.

## Source reconciliation

The verified local snapshot contained:

| Grain | Count | Meaning |
| --- | ---: | --- |
| Spec files | 67 | Source files under the framework test tree |
| Collected cases | 89 | Current Chromium collection, deduplicated by source test identity |
| Catalog setup guards | 46 | Included in the 89; missing-index/missing-bundle guard checks, not expanded catalog coverage |
| Other collected cases | 43 | Collected definitions excluding those setup guards; collection alone is not an execution result |
| Historical-only test identities | 28 | Present in saved evidence with no exact current collection match |
| Total imported test identities | 117 | 89 current plus 28 historical-only |
| Saved runs | 2 | Both dated 24 September 2026; stale for current-health decisions |
| Distinct imported findings | 12 | Test/browser/classification identities across both runs; not confirmed product bugs |

Thirty current tests matched saved evidence. Identity uses canonical relative file plus suite/title hierarchy, not the source line number. Only the known legacy `tests/<domain>/<purpose>/` path order is normalized to `tests/<purpose>/<domain>/`. Unmatched tests remain historical instead of being fuzzy-matched to another case.

The final retry wins within each test/browser/run. Browser outcomes stay distinct, and any unexpected browser result in the latest observed run remains visible. Findings retain all run occurrences. A passing result from a later run never erases the earlier occurrence or closes local triage.

Imported evidence is held in memory. Browser storage contains only local records and workflow overlays in `livelabs-qa-unified-workspace-v1`. Existing legacy keys and the v1 design store are untouched. Prior demo records are retained in their original interfaces rather than silently promoted into real evidence.

## Design basis

The supplied references establish warm board surfaces, compact task cards, persistent navigation, project-view tabs, and side details. Primary Asana references used:

- [Project views](https://asana.com/features/project-management/project-views)
- [Bug tracking workflow](https://help.asana.com/s/article/bug-tracking?language=en_US)
- [View-specific fields, filtering, and sorting](https://help.asana.com/s/article/filtering-and-sorting-custom-fields?language=en_US)

The implementation keeps Oracle Sans and the packaged Redwood palette. It uses the existing plain JavaScript stack; it is not an Oracle JET implementation or a claim of full JET compliance.

## Validation

- **58 unit tests passed:** 34 existing Hub checks and 24 TMS checks, including 13 new evidence/workspace tests.
- **46 integrated browser checks passed:** source counts, setup guards, immutable automation evidence, bug drag/status edits, notes, deep links, reload/refresh persistence, manual execution with evidence, linked bugs, plan creation/membership, bidirectional requirement links, monthly drag, saved run links, PAR unavailable state, on-call modes, backup, canonical TMS entry, mobile behavior, and offline-source fallback.
- **13 legacy checks passed:** Hub demo session and report routing; disabled execution; on-call access; TMS project creation, object traversal, edits, linked defects, persistence, and old deep links.
- Both project builds and validators passed.
- Desktop and mobile screenshots reviewed at 1440 × 1000 and 390 × 844.
- No browser runtime errors in integrated or retained legacy flows.

The old CDP smoke drivers crashed their browser targets in this environment. The `smoke:legacy` command now uses the shared Playwright harness, which passed the retained-interface checks. The original CDP scripts remain for history; they are no longer the default smoke driver.

Evidence: `output/screenshots/unified-hub-v2/manifest.md` and `results.json`. Review screenshots may include records created inside the isolated test browser. Those validation edits do not populate the user's review browser.

## Review and limits

Review Dashboard → Tests → Bugs & Findings → a linked test → Plans/Requirements. Imported saved evidence is dated and read-only. Workflow changes, manual outcomes, and notes are browser-local. Shared persistence, production authentication, live Jenkins/Jira integration, actual test execution controls, and external writeback remain outside this local iteration.

## Objectives

Describe the local QA Hub and TMS integration, its source boundaries, and its review limits.

## Estimated Time

Estimated Time: About 10 minutes to review the architecture and validation notes.

## Acknowledgements

Imported evidence remains read-only and local workflow edits stay browser-local; shared persistence and production integration are outside this iteration.
