# Webpage Screenshot Pipeline Installation And Use Guide

## Version 1.1.0 change

This version includes a package-local Playwright runtime contract under `webpage-screenshot-pipeline/tools/webpage-screenshot-pipeline`. The setup command installs the pinned Playwright package and Chromium before capture. This resolves the Nodoc error that reported Playwright missing under the tool path.

## Install and verify

Install the skill into the local Codex skills directory using the package root folder named `webpage-screenshot-pipeline`. After installation, verify that `SKILL.md`, `tools/webpage-screenshot-pipeline/package.json`, and the setup/capture scripts exist.

From the installed skill root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\webpage-screenshot-pipeline\setup.ps1
```

Then capture a test page:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\webpage-screenshot-pipeline\capture.ps1 -Url "https://example.com" -OutputPath "output/screenshots/smoke/example.png" -ViewportWidth 1440 -ViewportHeight 900 -FullPage
```

## Use

Start prompts with `$webpage-screenshot-pipeline`, provide the target URL, viewport, capture mode, output folder, and wait conditions. Keep a manifest with the capture evidence. Do not commit `node_modules`, browser binaries, credentials, cookies, or screenshot data containing private information.

## Version history

- version 1.1.0 - 2026-08-05 - Added package-local Playwright setup and capture wrappers for Nodoc runtime discovery.
- version 1.0 - 2026-05-11 - Initial browser-rendered screenshot workflow.
