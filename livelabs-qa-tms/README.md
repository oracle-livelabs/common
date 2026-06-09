# LiveLabs Test Management Solution

LiveLabs TMS is a separate local prototype linked from the LiveLabs QA Hub. It explores a TestLink-style and Xray-style test management workflow for LiveLabs QA without changing Jira, GitHub, WMS, or production LiveLabs systems.

## Prototype

Current status: demo-only static prototype with seeded/browser-local data. It is ready for manager review from GitHub Pages after this folder is pushed with `app/dist`.

Run locally:

```powershell
cd "C:\Users\Lucian Brinzei\Desktop\Desktop\Projects\livelabs-repos\common\livelabs-qa-tms\app"
npm test
npm run validate
npm run build
npm run smoke
npm start
```

Local review URL:

```text
http://127.0.0.1:4193
```

GitHub Pages path after push:

```text
https://oracle-livelabs.github.io/common/livelabs-qa-tms/
```

## Scope

The prototype includes:

- Test repository tree
- Projects/features
- Requirement documents
- Requirements and traceability matrix
- Test suites linked to test plans
- Test plans, builds, and tests inside each plan
- Test execution board and execution creation
- Execution reports and local export preview
- Defects and Jira/Xray-style mappings
- Link back to LiveLabs QA Hub
- Root `index.html` for GitHub Pages review from `/common/livelabs-qa-tms/`
- Local project, requirement-document, requirement, suite, plan, test, and execution creation
- Local execution status updates
- Local audit events

All data is local seeded and browser-persisted demo data.
