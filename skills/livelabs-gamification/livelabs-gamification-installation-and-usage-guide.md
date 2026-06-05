# LiveLabs Gamification Installation And Use Guide

## What The Skill Can Do

- add a scored quiz lab at the end of a LiveLabs workshop
- append a scored quiz to a FastLab markdown file
- insert quiz checks inside existing lab markdown at valid section boundaries

## Core Rules

- generate questions only from workshop content
- preserve existing instructional content verbatim
- add quiz content only at valid markdown boundaries
- validate changed files and report the validation location

## Installation Process

Give Codex this prompt:

```text
Install `livelabs-gamification` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `livelabs-gamification` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$livelabs-gamification` and give Codex the target path or content.

## What To Include In Your Request

- workshop root or markdown file
- quiz mode
- manifest file if adding a scored quiz lab
- preferred question count
- content scope limits such as which labs may be used

## Recommended Prompt Patterns

### Add A New Quiz Lab

```text
$livelabs-gamification create a scored quiz lab for <workshop-root>. Use <manifest-file> and create five conceptual questions from Labs 1-3 only.
```

### Distribute Quiz Checks

```text
$livelabs-gamification insert short unscored quiz checks into <lab-markdown-file> at valid section boundaries
```

## Common Pitfalls

- forgetting to name the manifest for a new scored quiz lab
- asking for questions based on material not taught in the workshop
- not giving a scope limit when only some labs should be used
- assuming rendering issues are always markdown-only

## Expected Output From Codex

- files changed
- quiz mode used
- badge or scoring metadata if applicable
- validation result for changed files
- where the validation report was saved

## Quick Checklist

- embedded name is `livelabs-gamification`
- package ZIP exists
- quiz mode is explicit
- content scope and validation status are reported

## Versioning History

- version 1.0 - 05/11/26
