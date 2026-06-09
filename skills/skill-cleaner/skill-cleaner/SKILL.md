---
name: skill-cleaner
description: Clean, trim, security-scan, validate, and optionally repackage ChatGPT/Codex skill folders or skill ZIP archives. Use when the user asks to clean up a skill folder, trim unused skill resources, remove redundant skill files, reduce skill package size, scan a skill for secrets, IPs, keys, credentials, hardcoded paths, or validate that cleanup did not break the skill.
---

# Skill Cleaner

Use this skill to clean another skill conservatively. Preserve behavior before reducing size.

## Core Rules

- Read the target `SKILL.md` first and treat it as the source of truth.
- Preserve `SKILL.md`, `agents/openai.yaml`, referenced files, indirectly referenced files, packaging files, and anything not clearly safe to remove.
- Remove only confirmed cruft: temporary files, caches, logs, OS junk, empty directories, duplicate dead files, stale placeholders, and clearly unused examples/templates.
- Keep questionable files and flag them for manual review.
- For environment-specific absolute paths, prefer a relative path when the target lives inside the skill package.
- If a relative path would point outside the skill package, recommend a CLI option or environment-variable fallback instead of a hardcoded user path.
- Never break references to save space.
- Do not silently delete suspected sensitive content.

## Workflow

1. Identify whether the target is a skill folder or `.zip`.
2. Run dry-run first:

```powershell
python ".\scripts\cleanup_skill.py" "<path-to-skill-or-zip>"
```

3. Review the Markdown report path printed in stdout.
4. Apply cleanup only when the dry-run report is conservative:

```powershell
python ".\scripts\cleanup_skill.py" "<path-to-skill-folder>" --apply
```

5. For ZIP input, write a cleaned archive without modifying the original:

```powershell
python ".\scripts\cleanup_skill.py" "<path-to-skill.zip>" --apply --output-zip "<path-to-skill.cleaned.zip>"
```

## Script Behavior

Use `scripts/cleanup_skill.py`.

The script:

1. locates the skill root
2. parses `SKILL.md` and collects direct and indirect references
3. classifies files conservatively
4. removes only confirmed cruft when `--apply` is used
5. scans text files for secrets, credentials, IPs, absolute paths, hostnames, usernames, personal names, and environment-specific values
6. validates required files, frontmatter, references, remaining security findings, structure, and packageability
7. writes a human-readable Markdown report and prints a concise stdout summary

Important options:

- `--apply`: remove confirmed cruft. Without this, run in dry-run mode.
- `--report <path>`: write the human-readable report to a specific path.
- `--json-report <path>`: write a machine-readable JSON report.
- `--json`: print the concise summary as JSON.
- `--output-zip <path>`: package the cleaned skill.
- `--remove-unused-references`: remove unreferenced files under `references/` only after reviewing dry-run output.

## Security Handling

- Remove a sensitive file only when it is clearly unreferenced and clearly unnecessary, such as an unreferenced private key, `.env`, credentials file, or stale backup.
- Treat sensitive filenames such as `.env`, private-key names, credentials files, and secrets files as security findings even when the file contents do not match a known secret pattern.
- Keep ambiguous findings and report them for manual review.
- Always report file path, line when available, pattern type, description, and action.
- Treat unresolved obvious secrets as validation warnings.

## Portability Handling

- Report hardcoded absolute paths as portability findings.
- Suggest a relative path only when the referenced target is inside the skill package.
- For output folders, cache folders, workspace folders, or user-specific locations outside the skill package, recommend a CLI option or environment variable with a safe fallback such as `Path.cwd()`.
- Resolve placeholder references such as `<skill-root>\scripts\cleanup_skill.py` to the real relative file path during reference validation.

## Report Must Include

- summary of changed or proposed changes
- files removed
- files preserved
- security findings with paths and pattern types
- portability findings with suggested replacements
- manual-review items
- remove failures, if apply mode could not remove a selected item
- validation results
- broken references and warnings
- output ZIP path when packaging is requested

## Final Response

Report the cleanup mode, report file path, files removed, security findings, manual-review items, validation status, and output ZIP path when created.
