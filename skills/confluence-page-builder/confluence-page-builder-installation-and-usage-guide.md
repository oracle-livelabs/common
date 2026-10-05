# Confluence Page Builder Installation And Use Guide

## What The Skill Can Do

- draft first-pass Confluence storage-format pages from notes or outlines
- restructure existing Confluence storage XML without breaking macros or layout
- audit generated storage markup and extract page outlines with bundled scripts
- run QA gates for duplicate section labels, redundant FAQ patterns, placeholders, ampersands, duplicate macro IDs, and storage balance
- create a Desktop working directory with version folders, logs, lessons learned, reports, and a usage guide
- run an iterative version loop with task reports, validation reports, review questions, and proposed improvements

## Core Rules

- preserve valid Confluence storage XML and macro structure
- keep the main reading path visible and use tabs or expands only where they improve scanability
- avoid duplicated parent/child labels, such as `FAQ` plus `FAQ Questions`
- create a workspace for page-building tasks unless the user asks for chat-only output
- load bundled references only when the task needs detailed Confluence syntax
- return storage-format output, validation status, version path, and targeted next-step questions

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
- whether you want a Desktop workspace or chat-only output
- what the reader should decide or do after reading
- examples of pages or layouts you want to follow

## Recommended Prompt Patterns

### Draft A Page

```text
$confluence-page-builder create a versioned Confluence storage-format governance page from these notes. Create a Desktop workspace, produce version 1, validate it, write a task report, and ask me targeted improvement questions: <paste notes>
```

### Audit Existing Storage

```text
$confluence-page-builder audit this Confluence storage XML file and report structural issues: <page-xml-file>
```

### Continue A Version

```text
$confluence-page-builder continue this workspace: <project-root>. Use my feedback to create the next version, validate it, update lessons learned, and report the new output path.
```

## Common Pitfalls

- asking for visual-only Markdown when Confluence storage XML is required
- omitting existing XML when the task is an edit instead of a new draft
- requesting unsupported custom macros without providing examples
- hiding the main narrative inside expand sections
- using tabs for unrelated sections instead of alternate views of the same topic
- repeating the same section label in parent and child headings

## Expected Output From Codex

- page outline or storage-format XML
- macro and structure decisions
- validation or audit notes
- QA-gate pass/fail notes
- Desktop workspace path when a page project is created
- `TASK_REPORT.md` and `VALIDATION_REPORT.md` after each version
- targeted review questions and proposed improvements
- remaining assumptions or fields needing source content

## Quick Checklist

- embedded name is `confluence-page-builder`
- package ZIP exists
- prompt includes target page intent
- output is storage-format where required
- QA gate passes before handoff
- workspace has `versions`, `logs`, `lessons-learned`, `reports`, `resources`, and `USER_GUIDE.md`
- latest version path is reported to the user

## Versioning History

- version 1.3 - 05/22/26
- version 1.2 - 05/21/26
- version 1.1 - 05/21/26
- version 1.0 - 05/11/26
