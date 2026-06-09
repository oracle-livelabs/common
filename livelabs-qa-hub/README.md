# LiveLabs QA Hub

LiveLabs QA Hub is a proposed operational hub for LiveLabs quality work across platform, content, LiveStack, analytics, automation, usage signals, sprint operations, and reporting.

This folder contains the static GitHub Pages review prototype:

- Requirements and implementation planning docs in `docs/`
- Capability folders in `sections/`
- A Redwood-styled static prototype in `app/`
- V3 operational pages for Command Center, QA Operations, GitHub Intake, Knowledge Base, Test Management, Reports, and Admin Console
- A linked LiveLabs QA TMS project in `../livelabs-qa-tms/`
- Root `index.html` for GitHub Pages review from `/common/livelabs-qa-hub/`

## Prototype

Current status: demo-only static prototype with seeded/browser-local data. It is ready for manager review from GitHub Pages after this folder is pushed with `app/dist`.

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@livelabs.qa` | `admin123` |
| User | `user@livelabs.qa` | `user123` |

Run locally:

```powershell
cd "C:\Users\Lucian Brinzei\Desktop\Desktop\Projects\livelabs-repos\common\livelabs-qa-hub\app"
npm test
npm run validate
npm run build
npm run smoke
npm start
```

The prototype uses local seeded data and browser local storage only. It is intended for product review before backend, database, Jira, CI/CD, WMS, or LiveLabs production integrations are selected.

Local review URL:

```text
http://127.0.0.1:4192
```

GitHub Pages path after push:

```text
https://oracle-livelabs.github.io/common/livelabs-qa-hub/
```

## Review Focus

- Confirm the core hub sections and naming.
- Review whether the Command Center action queue and source-freshness model make the dashboard clearer.
- Review whether Watchdog tabs and Health Monitor checks match the desired QA workflow.
- Review whether GitHub Intake and Knowledge Base should become first-class production modules.
- Review whether the separate LiveLabs TMS should stay independent, align to Xray/Jira, or use a hybrid model.
- Confirm whether the first production implementation should be static-first, Oracle JET, APEX, ORDS-backed full stack, or another approved stack.
- Confirm the initial system of record for each signal: Jira, GitHub/CI, LiveLabs platform, LiveStack builders, WMS, analytics JSON, or manual QA logs.
