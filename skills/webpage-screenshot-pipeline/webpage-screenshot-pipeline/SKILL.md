---
name: webpage-screenshot-pipeline
description: Capture reproducible screenshots of web pages for documentation, QA, bug reports, baselines, and before/after comparisons. Use when Codex needs browser-rendered desktop/mobile/full-page/element screenshots from one or more URLs, including authenticated flows. Prefer Playwright automation and Chrome DevTools MCP tools; fall back to OS-level screenshot capture only when browser tools cannot capture the target.
---

# Webpage Screenshot Pipeline

## Overview

Capture consistent artifacts first, then optimize speed.
Use deterministic folder/file naming so screenshots can be compared between runs.

## Tool Selection

Prefer tools in this order:

1. `playwright` skill for deterministic flow automation, multi-step auth, viewport switching, and repeatable captures.
2. `chrome-devtools` skill for element-targeted captures, quick interactive inspection, and network/console debugging tied to the screenshot run.
3. `screenshot` skill only as fallback when browser-level capture is impossible (for example native browser dialogs or whole-desktop evidence).

## Standard Output Contract

Write artifacts under one root per task:

```text
output/screenshots/<run-name>/
```

Use this filename pattern:

```text
<step>-<device>-<state>.png
```

Examples:

- `01-home-desktop-initial.png`
- `02-login-desktop-filled.png`
- `03-dashboard-mobile-loaded.png`

Save a manifest at the end:

```text
output/screenshots/<run-name>/manifest.md
```

Include URL, viewport, capture mode (full page vs viewport vs element), timestamp, and notable caveats (cookie banners, failed assets, auth stubs).

## Capture Workflow

1. Define capture matrix.
Specify URLs, required states, desktop/mobile viewports, and full-page or element-only needs.
2. Prepare deterministic environment.
Set viewport, clear or preserve storage according to the scenario, and wait for stable content.
3. Capture baseline sequence.
Capture all desktop shots first, then mobile shots with the same state order.
4. Verify artifacts immediately.
Confirm each target file exists and is non-empty before moving on.
5. Record evidence.
Write `manifest.md` with command/tool summary and any deviations.

## Reliability Rules

- Re-capture after any interaction that changes DOM structure.
- Wait for critical content instead of using fixed sleeps whenever possible.
- Keep one source of truth for viewport sizes per run.
- Reuse existing `playwright`, `chrome-devtools`, and `screenshot` skill workflows rather than re-deriving commands.
- Prefer PNG for QA baselines and side-by-side diffs.

## Quick Recipes

Open [capture-recipes.md](references/capture-recipes.md) for:

- Playwright capture recipe (desktop + mobile matrix).
- Chrome DevTools MCP element/full-page capture recipe.
- Fallback OS-level screenshot recipe.
