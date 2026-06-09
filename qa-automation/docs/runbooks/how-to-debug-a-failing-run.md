# How To Debug A Failing Run

Start with collection and runtime checks:

```powershell
npm run doctor
npm run typecheck
npm run test:collect
```

Run the smallest failing target:

```powershell
node ./scripts/qa.mjs tests/platform/smoke/public/homePage.spec.ts --headed --maxfail 1
```

Use debug mode when locator timing or page state is unclear:

```powershell
node ./scripts/qa.mjs tests/platform/smoke/public/homePage.spec.ts --debug
```

Open reports and traces:

```powershell
node ./scripts/qa.mjs report
node ./scripts/qa.mjs trace
```

Check the HTML report first. It includes steps, screenshots, failure context, run metadata, console messages, page errors, failed requests, response errors, and DOM snapshots when available.

Use these signals to narrow the problem:

| Signal | What To Check |
| --- | --- |
| Test was not collected | Spec path, filename ending, imports, TypeScript errors |
| Locator timed out | Page object selector, current DOM, responsive viewport, cookie banner |
| Search did not navigate | Search input selector, submit path, LiveLabs response time |
| Auth test skipped | `QA_STORAGE_STATE` and the target URL required by the auth spec |
| Browser launch failed | Browser installation, `QA_BROWSER_CHANNEL`, local execution policy |

After fixing a failure, run:

```powershell
npm run typecheck
npm run test:collect
node ./scripts/qa.mjs tests/platform/smoke
```
