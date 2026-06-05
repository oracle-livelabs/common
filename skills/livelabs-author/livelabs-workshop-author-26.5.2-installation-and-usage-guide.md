# LiveLabs Workshop Author 26.5.2 Installation And Use Guide

## What The Skill Can Do

- create or update Oracle LiveLabs workshops from source materials
- scaffold workshop structure, author markdown labs, build manifests, and validate output
- provide a lean authoring workflow for source-only workshop creation

## Core Rules

- keep workshop authoring focused on core LiveLabs content creation
- use dedicated screenshot, gamification, and industry-conversion skills when those tasks are needed
- validate generated workshops before final delivery
- avoid machine-specific paths in templates, examples, and output instructions

## Installation Process

Give Codex this prompt:

```text
Install `livelabs-workshop-author-26.5.2` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `livelabs-author` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$livelabs-author` and give Codex the target path or source material.

## What To Include In Your Request

- source materials such as docs, blogs, demos, notebooks, or product pages
- target workshop slug and output folder
- whether FreeSQL content or traceability is required
- validation expectations and known constraints

## Recommended Prompt Patterns

### Create A Workshop

```text
$livelabs-author create a LiveLabs workshop from this product brief in <new-workshop-folder> and include validation artifacts
```

### Update Existing Workshop

```text
$livelabs-author update <workshop-root> with this new product scenario and rerun validation
```

## Common Pitfalls

- expecting screenshot capture from the lean author skill
- hardcoding validator or sample-workshop paths
- skipping manifest validation
- letting source claims drift while rewriting workshop copy

## Expected Output From Codex

- workshop plan
- created or updated markdown files
- manifest changes
- validation result and remaining issues
- traceability or assumptions when source material is incomplete

## Quick Checklist

- embedded name is `livelabs-author`
- package ZIP exists
- requested output folder is writable
- output includes validation evidence

## Versioning History

- version 26.5.2 - 05/11/26
