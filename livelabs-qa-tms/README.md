# LiveLabs Test Management

Test Management is integrated into the main LiveLabs QA Hub dashboard and menu. The shared UI uses Asana-style Board and List views, with linked test, bug, plan, requirement, and run-evidence detail panels.

## Open locally

From `app/`:

```powershell
npm start
```

The [TMS entry](http://127.0.0.1:4193/) opens [Tests in QA Hub](http://127.0.0.1:4192/#section=tests). The launcher starts the Hub reader if it is not already available. Both entry points converge on port 4192, keeping the unified browser-local state on one origin.

The [previous TMS](http://127.0.0.1:4193/legacy.html) and its original `livelabs-tms-state-v2` browser storage remain available. Historical demo records are not mixed with real framework evidence.

## What this project owns

- `app/public/workspace-model.mjs`: shared test, bug, work-item, requirement-link, plan, and manual-result behavior.
- `app/scripts/automation-adapter.mjs`: reads the sibling QA Automation collection and saved reports, normalizes identities, and returns a minimized evidence projection.
- `app/tests/workspace.test.mjs`: source matching, retry handling, deduplication, evidence immutability, manual execution, setup guards, and plan integrity.
- The retained legacy model/UI and tests for earlier project, suite, requirement-document, execution, and lifecycle workflows.

The Hub project owns the integrated renderer and navigation. Its static build packages this project's shared model. No separate duplicated TMS interface or browser-local store is used for the new workflow.

## Workflow and evidence

- **Tests:** Backlog → Ready → In progress → In review → Done.
- **Bugs & findings:** Needs triage → Confirmed → In progress → Ready to retest → Closed.
- Dragging or editing a status changes local workflow only. Imported pass/fail/skipped results retain their original run, browser, and timestamp.
- Current collection, catalog setup guards, historical-only test identities, and manual tests remain visibly distinct.
- Automation findings require triage; they are not automatically confirmed product bugs.
- Tests link to bugs, plans, requirements, and saved run evidence. Manual test results require a user-supplied evidence note.
- Plans can be created from a filtered test view and updated later. Requirements support explicit test links in both directions.

The development backend is read-only. Refresh collects test names without running browsers. There are no Jenkins execution, Jira writeback, deployment, or notification endpoints. Local workflow changes are saved in the Hub origin's `livelabs-qa-unified-workspace-v1` browser store; imported evidence is not copied into that store.

## Checks

```powershell
npm test
npm run build
npm run validate
npm run smoke
```

`npm run smoke` runs the shared Hub integration checks and needs both local servers plus installed Chrome and the sibling Playwright dependency. `npm run smoke:legacy` checks the retained TMS interface.

See [the integration report](../livelabs-qa-hub/docs/integrated-tms-v2.md). Earlier feature maps and version reports describe the retained legacy prototype, not the new default navigation.
