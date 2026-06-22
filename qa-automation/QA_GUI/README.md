# QA GUI

Small local app for checking a published LiveLabs workshop with the built-in `?qa=true` checker.

## Run

From `qa-automation`:

```powershell
npm run workshop:qa:app
```

Open `http://127.0.0.1:8787`, paste the published workshop URL, and click **Run QA**.

The app fetches the workshop manifest, opens every lab as `?qa=true&lab=<lab-id>`, waits for the QA report to settle, and shows pass/fail status, issue counts, logs, and report links.

The History tab keeps the last 5 completed runs from `artifacts/runs`. The app also remembers the active run ID in the browser, so using the report or JSON links and then returning to the app restores the last result instead of forcing another run.

## Files

- `public/` contains the browser UI.
- `scripts/workshop-qa-app.mjs` starts the local app server.
- `scripts/published-workshop-qa.mjs` runs the Playwright lab checker.
- `artifacts/` is generated at runtime and ignored by Git.

## CLI

You can still run the checker without the GUI:

```powershell
npm run workshop:qa -- "https://oracle-livelabs.github.io/<repo>/<path>/workshops/tenancy/index.html"
```
