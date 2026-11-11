# Skill Cleaner Installation And Use Guide

## What The Skill Can Do

- dry-run clean a skill folder or ZIP and report safe removals
- scan for secrets, sensitive filenames, IPs, hostnames, user paths, and hardcoded local values
- apply conservative cleanup or package a cleaned ZIP after review

## Core Rules

- read target `SKILL.md` first and preserve referenced files
- dry-run before apply
- remove only confirmed cruft
- keep ambiguous files and report manual-review items
- write reports outside installed skill folders

## Installation Process

Give Codex this prompt:

```text
Install `skill-cleaner` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `skill-cleaner` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$skill-cleaner` and give Codex the target path or content.

## What To Include In Your Request

- target skill folder or ZIP path
- dry-run or apply mode
- report output folder
- whether to create a cleaned ZIP
- whether unused references may be removed after review

## Recommended Prompt Patterns

### Dry Run A Skill ZIP

```text
$skill-cleaner dry-run clean this skill ZIP and write reports under <report-output-folder>: <skill-zip-file>
```

### Apply Cleanup To Folder

```text
$skill-cleaner apply cleanup to <skill-folder> after reviewing the dry-run report, then validate packageability
```

## Common Pitfalls

- running apply before reviewing dry-run output
- deleting ambiguous resources just to shrink size
- leaving reports inside `.codex\skills`
- treating no-op cleanup as failure when no safe deletions exist

## Expected Output From Codex

- cleanup mode
- report paths
- files removed or proposed
- security and portability findings
- manual-review items
- validation status
- output ZIP path when created

## Quick Checklist

- embedded name is `skill-cleaner`
- dry-run report exists before apply
- security findings are reviewed
- validation status is PASS or documented

## Versioning History

- version 1.0 - 05/11/26
