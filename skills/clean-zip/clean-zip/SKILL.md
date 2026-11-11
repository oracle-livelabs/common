---
name: clean-zip
description: Create clean distributable ZIP archives from files or project directories while excluding macOS metadata, Python caches, VCS metadata, editor temporary files, and other generated artifacts. Use when packaging a project, source tree, handoff bundle, deployment archive, or any ZIP that must not contain .DS_Store, __MACOSX, __pycache__, resource forks, or similar clutter.
---

# Clean ZIP

Use the bundled `scripts/create_clean_zip.py` helper for ZIP creation. It produces a normal `.zip` archive with sorted entries, no macOS resource-fork metadata, and a post-write integrity/content check.

## Quick start

From the skill directory, run:

```bash
python3 scripts/create_clean_zip.py /path/to/project /path/to/output/project.zip
```

The source directory name is retained as the archive's top-level folder. Use `--contents-only` when the archive should contain the source contents directly:

```bash
python3 scripts/create_clean_zip.py /path/to/project /path/to/output/project.zip --contents-only
```

Create the destination directory first when it does not exist. Do not place the output ZIP inside the source tree unless it is intentionally excluded; the helper automatically skips the output path when it is inside the source.

## Default exclusions

The helper excludes these categories by default:

- macOS metadata: `.DS_Store`, `__MACOSX`, `._*` resource forks, `.AppleDouble`, `.LSOverride`, Spotlight/Trash/temporary/revision directories, and related marker files
- Python/generated caches: `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.tox`, `.nox`, `.eggs`, `*.pyc`, and `*.pyo`
- source-control and local IDE metadata: `.git`, `.hg`, `.svn`, `.idea`, `.vscode`
- common editor/OS temporary files: `Thumbs.db`, `desktop.ini`, `*.swp`, `*.swo`, and names ending in `~`

Meaningful dotfiles such as `.gitignore` and `.env.example` remain included. Do not add broad exclusions such as `dist`, `build`, `node_modules`, or all hidden files unless the task explicitly calls for them; those may be required deliverables.

## Adjust exclusions safely

Add project-specific patterns with repeated `--exclude` options. Patterns match either a relative archive path or its basename:

```bash
python3 scripts/create_clean_zip.py project release.zip \
  --exclude 'tmp/**' \
  --exclude '*.log'
```

Use `--no-default-excludes` only when the requester explicitly needs files normally treated as metadata. If the archive must have a particular root folder, use `--root-name NAME`; otherwise use `--contents-only` for a rootless archive.

## Verify the result

After creation, check the helper's summary. It reports the number of archived files/directories and skipped paths, and fails if the ZIP cannot be read back or contains a default-excluded path. For an additional inspection, list entries without extracting:

```bash
unzip -l /path/to/output/project.zip
```

Never claim an archive is clean without checking its entry list. Keep skipped-path warnings visible so an accidentally omitted symlink or custom-excluded file is not mistaken for a successful package.

## Security And Portability Notes

- The helper never needs credentials, tokens, private keys, or account-specific configuration.
- Treat secret-bearing files in the source tree as project content unless the requester explicitly excludes them. Use `--exclude` for sensitive or local-only files such as `.env`, credential exports, private keys, logs, and machine-local config.
- Prefer relative source and output paths from the current workspace when possible. If a repeatable workflow needs a fixed output location, make it a prompt parameter instead of hardcoding a user-specific path.
- Do not include the output ZIP inside the source tree unless you have confirmed the helper skipped it and the archive entry list is clean.

## Resource

- `scripts/create_clean_zip.py` - deterministic ZIP creator and validator. Prefer running it over rewriting ad hoc `zip` commands.
