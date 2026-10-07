# LiveLabs QA Hub

A compact Redwood-styled workspace for QA results, on-call review, PAR findings, test coverage and repository information.

## Open locally

From this folder:

```powershell
cd app
npm start
```

Open [QA Hub](http://127.0.0.1:4192/). The local server binds to `127.0.0.1:4192` and reads the sibling `qa-automation` folder and LiveLabs repository checkouts. Use this address rather than `localhost` because the development reader validates the Host header.

Demo accounts: `admin@livelabs.qa` / `admin123`, or `user@livelabs.qa` / `user123`. The demo sign-in controls presentation only and is not production authentication.

## Pages

Overview → On-Call → Jenkins Reports → PAR Links → QA Automation → Repositories. Settings is at the bottom of the menu. The QA Operations launcher, TMS and Knowledge Base are removed from the current interface. Old Hub route names redirect to relevant pages.

Tables support search, a relevant filter, column sorting, result counts and pagination. Technical detail is disclosed on demand. Oracle Sans, Bark navigation, warm neutral surfaces and restrained statuses follow the Analytics/Author Guide family.

## Data available now

- Saved local run reports and original HTML report links, with source dates and stale labels.
- Automation spec-file counts, test lanes and latest section results.
- Local LiveLabs repository, workflow and manifest inventory. This is not a live PR feed.
- Explicitly loaded synthetic on-call cases and version-bound review previews. Support data stays in memory.
- A test request preview. The Run tests button remains disabled until the private execution API is connected.

No local endpoint triggers jobs or writes to external systems. The original HTML report is a local read-only preview; network actions and adjacent report artifacts are not enabled by that link. The three `/api/local/*` routes expose a minimized projection; local reports are not copied into public assets or `app/dist`.

## Delivery and plans

- [Architecture review and page actions](docs/architecture-and-actions-review-2026-10-05.md) — recommended QA Automation tabs, Analytics/author workflows, Jenkins/VM findings and live access limits.
- [Framework capability inventory](docs/automation-capability-inventory.json) — 28 spec files and 30 declared tags; source inventory only.
- [Connected QA Hub implementation plan](docs/connected-qa-hub-plan.md)
- [Source review and inventory](docs/source-review-2026-10-05.md)
- [Current requirements](docs/requirements.md)
- [Redwood design notes](docs/redwood-design-notes.md)
- [On-call adapter contract](docs/on-call-review-slice.md)

Build the static review package with `npm run build` from `app/`. A static host cannot serve the local source readers: it shows unavailable states and the optional synthetic on-call preview. Live production integration requires the private backend described in the plan. No deployment or GitHub publication is part of this local update.

The existing `npm test`, `npm run validate` and `npm run smoke` commands remain available for a requested validation pass. This iteration includes syntax, build, HTTP and manual browser checks; automated test suites were not run.
