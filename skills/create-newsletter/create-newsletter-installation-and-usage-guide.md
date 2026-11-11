# Create Newsletter Installation And Use Guide

## What The Skill Can Do

- draft newsletters in Markdown using email-safe structure
- revise newsletter content for clarity and section flow
- render Markdown to HTML and text with the bundled `render_newsletter.mjs` script

## Core Rules

- verify `emailmd` is available before rendering
- keep source Markdown and rendered HTML/text as separate deliverables
- use portable script paths from the installed skill instead of hardcoded user paths

## Installation Process

Give Codex this prompt:

```text
Install `create-newsletter` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `create-newsletter` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$create-newsletter` and give Codex the target path or content.

## What To Include In Your Request

- audience and send purpose
- source notes or existing Markdown
- required calls to action
- output folder for rendered files
- tone constraints and legal or brand limits

## Recommended Prompt Patterns

### Draft And Render

```text
$create-newsletter draft an internal launch newsletter from these notes and render HTML and text outputs in <newsletter-output-folder>
```

### Revise Existing Copy

```text
$create-newsletter tighten this newsletter draft, keep the same audience and calls to action, then render it: <newsletter-markdown-file>
```

## Common Pitfalls

- forgetting to ask for rendered outputs when HTML is needed
- mixing final HTML edits back into the Markdown source manually
- using machine-specific script paths instead of the installed skill path

## Expected Output From Codex

- newsletter Markdown source
- rendered HTML path
- rendered text path when requested
- package or dependency checks performed
- summary of edits and assumptions

## Quick Checklist

- embedded name is `create-newsletter`
- package ZIP exists
- `emailmd` availability was checked before rendering
- HTML output was opened or inspected after rendering

## Versioning History

- version 1.0 - 05/11/26
