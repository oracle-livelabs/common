---
name: webpage-screenshot-pipeline
description: Capture reproducible browser-rendered screenshots for documentation, QA, bug reports, baselines, and before/after comparisons. Uses the package-local Playwright runner when configured, then Chrome DevTools MCP, then an explicit OS-level fallback.
---

# Webpage Screenshot Pipeline

## Runtime prerequisite

This skill includes a package-local Playwright tool under `tools/webpage-screenshot-pipeline`. The original package only named an external `playwright` skill; that caused Nodoc to report that Playwright was not installed under the tool path.

Before the first capture on a machine, run the setup command from the skill root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\webpage-screenshot-pipeline\setup.ps1
```

On macOS or Linux:

```bash
bash ./tools/webpage-screenshot-pipeline/setup.sh
```

Setup checks Node.js and npm, installs the pinned Playwright package into the package-local tool directory, and installs the Chromium browser. It is safe to rerun. If a managed machine already has Google Chrome or Microsoft Edge, pass `-BrowserChannel chrome` or `-BrowserChannel msedge` to use that installed browser without downloading a Playwright browser. If setup cannot run, report the exact missing prerequisite and use Chrome DevTools MCP or the documented OS fallback; do not claim a Playwright capture.

## Capture

Use the package-local runner after setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\webpage-screenshot-pipeline\capture.ps1 `
  -Url "https://example.com" `
  -OutputPath "output/screenshots/example/01-home-desktop-initial.png" `
  -ViewportWidth 1440 -ViewportHeight 900 -FullPage -BrowserChannel chrome
```

The runner waits for the page load state, captures PNG output, and validates that the file is non-empty. It returns a non-zero exit code with a remediation message when the local Playwright install is missing.

## Workflow

1. Define URLs, states, viewports, and full-page or element-only capture needs.
2. Run setup once per machine or package environment.
3. Capture desktop states, then mobile states, using deterministic names.
4. Verify every file exists and is non-empty.
5. Write `output/screenshots/<run-name>/manifest.md` with URL, viewport, capture mode, timestamp, and caveats.

## Tool order

1. Package-local Playwright runner for deterministic automation.
2. Chrome DevTools MCP for interactive debugging and element captures.
3. OS-level screenshot only when browser capture is unavailable; record the reason.

## Reliability rules

- Wait for critical content instead of relying on fixed sleeps.
- Re-capture after an interaction changes the DOM.
- Keep viewport sizes in one capture matrix.
- Do not silently fall back from a failed Playwright setup.
- Do not include credentials, tokens, cookies, or private customer data in screenshots.

## References

- [Capture recipes](references/capture-recipes.md)
- [Playwright tool README](tools/webpage-screenshot-pipeline/README.md)
