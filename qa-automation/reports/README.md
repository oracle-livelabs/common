# QA Run Reports

Playwright writes a project-level summary here on every run.

- `index.html` redirects to the latest summary.
- `latest/summary.html` is the latest formatted run summary.
- `latest/retest-list.html` is the local Retest List view for tests selected from the summary.
- `latest/fix-list.html` is the local Fix List view for tests selected from the summary.
- `latest/summary.md` is the latest Markdown summary.
- `latest/summary.json` is the latest machine-readable summary.
- `runs/<timestamp>/` keeps timestamped summaries for previous runs.

These generated run files are ignored by Git.

## Retest and Fix Lists

The summary page lets a reviewer add an item to either list. The selections are
stored in browser `localStorage`, so they persist while moving between
`summary.html`, `retest-list.html`, and `fix-list.html` on the same report host.

Use the Retest List page to download a payload, then run:

```powershell
node ./scripts/report-review-action.mjs retest --payload <payload.json>
```

Use the Fix List page to download a payload, then run:

```powershell
node ./scripts/report-review-action.mjs fix --payload <payload.json>
```

The fix action writes a Codex prompt and payload under `artifacts/review-lists/`.
After the fixes are applied, rerun the same selected tests with the retest
action so the normal QA report shows the final pass/fail result.
