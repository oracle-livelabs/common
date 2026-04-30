# How To Debug A Failing Run

Useful commands:

```powershell
run doctor
run tests\platform --collect-only
run tests\platform\smoke --maxfail 1
run tests\platform\smoke\public\homePage.spec.ts --headed
run tests\platform\regression\public\searchEdgeCases.spec.ts --headed --maxfail 1
run report
run trace
```

Tips:

- use `--collect-only` to confirm path resolution before running
- use `--headed` to watch the browser
- use `--debug` for Playwright debug mode
- use `run report` to open the latest HTML report
- use `run trace` to open the latest trace
- inspect `results.json` when you want machine-readable output for the run
- inspect `qa-run-context`, `failure-page-state`, and `failure-dom-snapshot` in the report attachments when a test fails
- inspect `qa-console.log`, `qa-page-errors.log`, `qa-request-failures.log`, and `qa-response-errors.log` when the failure might be environment- or browser-related
- inspect the trace zip, `video.webm`, and `error-context.md` under `artifacts/.../test-results` when a test fails
