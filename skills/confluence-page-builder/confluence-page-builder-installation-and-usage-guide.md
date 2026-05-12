# Confluence Page Builder Installation And Use Guide

## What The Skill Can Do

- draft first-pass Confluence storage-format pages from notes or outlines
- restructure existing Confluence storage XML without breaking macros or layout
- audit generated storage markup and extract page outlines with bundled scripts

## Core Rules

- preserve valid Confluence storage XML and macro structure
- load bundled references only when the task needs detailed Confluence syntax
- return storage-format output or a clear change summary, depending on the request

## Installation Process

Give Codex this prompt:

```text
Install `confluence-page-builder` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `confluence-page-builder` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$confluence-page-builder` and give Codex the target path or content.

## What To Include In Your Request

- target page purpose and audience
- source notes, existing XML, or desired outline
- required sections, macros, expand blocks, tables, tabs, or callouts
- whether you want full storage XML or a review report

## Recommended Prompt Patterns

### Draft A Page

```text
$confluence-page-builder create a Confluence storage-format governance page from these notes: <paste notes>
```

### Audit Existing Storage

```text
$confluence-page-builder audit this Confluence storage XML file and report structural issues: <page-xml-file>
```

## Common Pitfalls

- asking for visual-only Markdown when Confluence storage XML is required
- omitting existing XML when the task is an edit instead of a new draft
- requesting unsupported custom macros without providing examples

## Expected Output From Codex

- page outline or storage-format XML
- macro and structure decisions
- validation or audit notes
- remaining assumptions or fields needing source content

## Quick Checklist

- embedded name is `confluence-page-builder`
- package ZIP exists
- prompt includes target page intent
- output is storage-format where required

## Versioning History

- version 1.0 - 05/11/26
