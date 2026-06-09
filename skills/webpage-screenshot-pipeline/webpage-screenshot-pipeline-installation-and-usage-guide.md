# Webpage Screenshot Pipeline Installation And Use Guide

## What The Skill Can Do

- capture reproducible screenshots of web pages for documentation, QA, bug reports, and baselines
- choose Playwright, Chrome DevTools MCP, or OS-level fallback based on target and constraints
- produce desktop, mobile, full-page, or element screenshots with repeatable settings

## Core Rules

- prefer browser-rendered capture for web targets
- record viewport, URL, timing, and authentication assumptions
- verify screenshots are nonblank and framed correctly
- use OS fallback only when browser tools cannot capture the target

## Installation Process

Give Codex this prompt:

```text
Install `webpage-screenshot-pipeline` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `webpage-screenshot-pipeline` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$webpage-screenshot-pipeline` and give Codex the target path or content.

## What To Include In Your Request

- target URL or local file path
- viewport sizes and full-page versus element capture
- authentication or setup steps
- output folder and naming expectations
- wait conditions such as network idle or visible selector

## Recommended Prompt Patterns

### Capture Desktop And Mobile

```text
$webpage-screenshot-pipeline capture desktop and mobile full-page screenshots of <target-url> into <screenshot-output-folder>
```

### Capture An Element

```text
$webpage-screenshot-pipeline capture the chart element on this page after the data loads: <target-url>
```

## Common Pitfalls

- capturing before data finishes loading
- not specifying mobile or desktop viewports
- forgetting authentication state
- accepting blank or badly framed screenshots without verification

## Expected Output From Codex

- screenshot file paths
- viewport and capture settings
- validation result
- fallback tool used if any
- issues such as blank canvas, overlap, or auth failure

## Quick Checklist

- embedded name is `webpage-screenshot-pipeline`
- URL and viewport are explicit
- output path is provided
- screenshots are visually verified

## Versioning History

- version 1.0 - 05/11/26
