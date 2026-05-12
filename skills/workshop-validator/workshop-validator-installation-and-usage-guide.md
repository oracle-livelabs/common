# Workshop Validator Installation And Use Guide

## What The Skill Can Do

- validate LiveLabs workshop folder and manifest structure
- check Markdown formatting and LiveLabs rules
- apply Richard Lanham language grading and emit `VALIDATION-RESULT.md`

## Core Rules

- inspect workshop root before validating
- separate structure, manifest, markdown, and prose findings
- write clear file-by-file ratings
- do not hide baseline failures

## Installation Process

Give Codex this prompt:

```text
Install `workshop-validator` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `workshop-validator` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$workshop-validator` and give Codex the target path or content.

## What To Include In Your Request

- workshop root path
- manifest path if nonstandard
- whether to run full validation or focused recheck
- output location for validation report
- known baseline issues

## Recommended Prompt Patterns

### Validate A Workshop

```text
$workshop-validator validate <workshop-root> and write VALIDATION-RESULT.md with file-by-file ratings
```

### Review Failed Validation

```text
$workshop-validator review this workshop after edits and tell me which failures block publishing: <workshop-root>
```

## Common Pitfalls

- validating the wrong folder level
- mixing baseline issues with newly introduced issues
- skipping manifest checks
- treating style suggestions as structural blockers without labeling severity

## Expected Output From Codex

- VALIDATION-RESULT.md path
- structure findings
- manifest findings
- markdown findings
- Lanham/prose ratings
- publishing blockers and recommended fixes

## Quick Checklist

- embedded name is `workshop-validator`
- workshop root is correct
- report path is produced
- findings are grouped by validation category

## Versioning History

- version 1.0 - 05/11/26
