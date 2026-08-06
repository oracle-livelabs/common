# Package-local Playwright tool

This directory is intentionally part of the skill package. It prevents the Nodoc runtime from looking for an undeclared external Playwright skill under `tools/webpage-screenshot-pipeline`.

## Setup

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

The setup script installs the version pinned in `package.json` and Chromium into the machine's Playwright cache. It does not commit `node_modules` or browser binaries into the skill ZIP.

## Capture

```powershell
powershell -ExecutionPolicy Bypass -File .\capture.ps1 -Url "https://example.com" -OutputPath "output/screenshots/example/page.png" -ViewportWidth 1440 -ViewportHeight 900 -FullPage
```

If the managed machine already has Google Chrome or Microsoft Edge, use `-BrowserChannel chrome` or `-BrowserChannel msedge` to avoid a Playwright browser download.

The wrapper checks that the package-local install exists before invoking Playwright and gives a direct setup command when it does not.

It also checks that the Playwright Chromium executable exists and reports the exact setup command when the browser download is incomplete.
