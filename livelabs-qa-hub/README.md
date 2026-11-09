# LiveLabs QA Hub

A shared local workspace for QA planning, test management, bug triage, and automation evidence. The main UI uses the Asana-inspired design reviewed on 4 November 2026, with Oracle Sans and warm Redwood colors.

## Open locally

From `app/`:

```powershell
npm start
```

Open [QA Hub](http://127.0.0.1:4192/). The dashboard and every integrated view use this single origin so browser-local work stays shared. Use `127.0.0.1`, not `localhost`; the read-only development reader validates the Host header.

## Main menu

- **QA dashboard:** current collection counts, catalog setup guards, open findings, local plans, and dated execution evidence.
- **QA work:** local tasks in Board, List, or monthly Roadmap views.
- **Tests:** automation cases collected from the sibling `qa-automation` project, historical-only records, and local manual tests.
- **Bugs & findings:** Needs triage → Confirmed → In progress → Ready to retest → Closed.
- **Test plans:** create a scope from selected tests or the current filtered test view; edit membership and plan status.
- **Requirements:** capture expected behavior and link tests in both directions.
- **Automation runs:** saved run history and per-test evidence; Live Jenkins Reports are not connected.
- **PAR Links, On-Call, Repositories:** existing local readers and the explicit synthetic/private on-call review flow.
- **Sources & workspace:** availability, local backup, and earlier UI entry points.

Test workflow uses Backlog → Ready → In progress → In review → Done. Workflow edits never overwrite imported execution results. Local manual tests can record a separate manual outcome with required evidence. Bugs link to tests and saved run occurrences; a later pass does not silently close a bug.

## Data and persistence

The TMS project owns `app/public/workspace-model.mjs` and `app/scripts/automation-adapter.mjs`. Hub serves the shared model at `/tms/workspace-model.mjs` and the minimized read-only evidence projection at `/api/local/tms`.

Refresh uses Playwright `--list --reporter=json --project=chromium` to collect names without executing tests, then reads saved reports. Results are cached for 60 seconds; explicit refresh rebuilds the projection. Imported contacts, access URLs, raw errors, and attachments are excluded.

At validation, the source contained 67 spec files and 89 collected cases, including 46 catalog setup guards. Another 28 test identities were present only in saved reports. Two saved runs from 24 September 2026 produced 12 distinct findings requiring triage. These are source observations, not current platform-health claims.

Workflow edits, notes, local tests/bugs/tasks, plans, and requirements use `livelabs-qa-unified-workspace-v1` in browser storage. Imported evidence and support data remain in memory. No Jira writeback, job execution, notifications, deployment, or production authentication is implemented.

## Earlier interfaces

- [Original Hub](http://127.0.0.1:4192/legacy.html), with original demo session/storage intact.
- [First visual prototype](http://127.0.0.1:4192/prototype.html), with its separate sample-task storage.
- [Original TMS](http://127.0.0.1:4193/legacy.html), after starting the TMS app. Its existing browser data is retained on port 4193.

Starting `npm start` in the sibling TMS app provides its port-4193 entry, starts the Hub if needed, and opens the canonical Hub Tests view. Earlier TMS records are not silently merged into framework evidence.

## Validation and build

From `app/`:

```powershell
npm test
npm run build
npm run validate
npm run smoke
```

The integrated smoke test requires the Hub and TMS local entry servers, installed Chrome, and the sibling QA Automation Playwright dependency. It uses an isolated browser context. `npm run smoke:legacy` checks the retained Hub interface; `npm run smoke:prototype` checks the first design prototype.

The static build copies the TMS model into `app/dist/tms/`. Static hosting cannot access local readers and shows unavailable evidence states instead of fabricated results.

See [integration decisions and validation](docs/integrated-tms-v2.md), [requirements](docs/requirements.md), and [screenshot evidence](output/screenshots/unified-hub-v2/manifest.md). Earlier version reports are historical design records.
