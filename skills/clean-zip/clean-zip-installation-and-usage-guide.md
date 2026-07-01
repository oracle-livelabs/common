# Clean ZIP Installation And Use Guide

## What The Skill Can Do

- create clean distributable ZIP archives from files or project directories
- exclude macOS metadata, Python caches, VCS folders, editor temporary files, and generated clutter
- keep meaningful dotfiles such as `.gitignore` and `.env.example` unless explicitly excluded
- validate the finished ZIP for readability and blocked metadata entries
- report archived file counts and skipped paths so package omissions are visible

## Core Rules

- use the bundled `scripts/create_clean_zip.py` helper instead of ad hoc ZIP commands
- keep the source directory name as the default archive root unless `--contents-only` or `--root-name` is requested
- add project-specific excludes explicitly with `--exclude`
- never claim an archive is clean without validating the entry list
- do not hardcode user-specific source or output paths into repeatable workflows

## Installation Process

Give Codex this prompt:

```text
Install `clean-zip` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `clean-zip` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$clean-zip` and give Codex the source path, output ZIP path, and any project-specific exclusions.

## What To Include In Your Request

- source file or directory path
- output ZIP path
- whether to keep the source folder as the top-level archive folder
- any extra excludes, such as logs, private config, or generated build output
- whether to show the ZIP entry list after creation

## Recommended Prompt Patterns

### Package A Project Folder

```text
$clean-zip create a clean ZIP from <project-folder> at <output-folder>/<name>.zip, keep the project folder as the archive root, validate the ZIP, and list skipped paths.
```

### Package Contents Only

```text
$clean-zip create a clean ZIP from <folder> at <output-folder>/<name>.zip with --contents-only and exclude *.log plus tmp/**.
```

## Common Pitfalls

- placing the output ZIP inside the source tree without checking it was skipped
- using broad excludes such as all dotfiles, `dist`, `build`, or `node_modules` without confirming they are not deliverables
- assuming sensitive files are excluded automatically when they are normal project content
- skipping the ZIP entry list inspection after creation

## Expected Output From Codex

- output ZIP path
- archived entry and file counts
- skipped path summary
- validation status
- any manual-review notes for custom excludes or sensitive source files

## Quick Checklist

- embedded name is `clean-zip`
- `scripts/create_clean_zip.py` exists
- output path ends in `.zip`
- skipped paths are reviewed
- archive validates and does not contain default-excluded metadata

## Versioning History

- version 1.0 - 07/01/26
