---
name: workshop-validator
description: Validate LiveLabs workshops end-to-end, including folder/manifest structure, Markdown formatting, and Richard Lanham language grading. Use when asked to audit a workshop root and emit VALIDATION-RESULT.md with file-by-file ratings.
---

# Workshop Validator

Comprehensive validation workflow for LiveLabs workshop repositories. Provide the absolute path to the workshop root (directory containing lab folders and the `workshops/` subtree) and follow the steps below.

## Quick Start
- Run `scripts/validate_workshop.py <workshop-root>`.
- The script audits structure, manifests, Markdown style, and prose (Lanham rules), then writes `VALIDATION-RESULT.md` into the same root.
- Open the report to review issues by category and file.

## Workflow

### 1. Prepare Context
- Review the sample workshop from your local LiveLabs repo clone when available, for example `<livelabs-repo>/common/sample-livelabs-templates/sample-workshop`.
- Skim the LiveLabs How-To guide from your local LiveLabs repo clone when available, for example `<livelabs-repo>/common/sample-livelabs-templates/create-labs/labs`.
- Keep `references/markdown_rules.md` and `references/lanham_guidelines.md` handy as checklists.

### 2. Validate Structure
- Confirm the root contains lab directories (e.g., `provision/`, `setup/`, `query/`) plus the `workshops/` folder.
- Each lab folder needs a same-named Markdown file (`provision/provision.md`) and `images/` subfolder.
- Inside `workshops/`, check for deployment variants (tenancy, sandbox, desktop, freetier) and verify each includes both `manifest.json` and `index.html`.
- Document missing folders/files; the script records these automatically.

### 3. Check Manifests
- For every `manifest.json`, ensure required fields (`workshoptitle`, non-empty `tutorials[]`, optional `help`, `include`, `variables`).
- Each tutorial entry must include `title`, `description` (recommended), and `filename` pointing to an existing Markdown file or approved URL.
- Relative paths are resolved from the manifest location; report missing files or invalid JSON.

### 4. Enforce Markdown Rules
- Recreate the official LiveLabs markdown validator checks:
  - One H1 per file; first line must be `# Title`.
  - Include `## Introduction`, `### Objectives`, `Estimated Time:` (or `Estimated Workshop Time:` for introductions), `## Acknowledgements`.
  - Enforce task header format, numbered steps, indentation for code/images, alt text for images, lowercase filenames, valid YouTube embeds, closed `<copy>` tags, no HTML anchors.
- Use the checklist in `references/markdown_rules.md` while troubleshooting failures.

### 5. Apply Richard Lanham Grading
- After formatting checks, evaluate prose quality using the Paramedic Method:
  - Hunt passive voice, nominalizations, wordy sentences (>20 words), contractions, em dashes, and missing Oxford commas.
  - Score each file 0-5 using `references/lanham_guidelines.md` and capture concrete notes.
- The script surfaces these findings per file so authors know where to tighten language.

### 6. Produce VALIDATION-RESULT.md
- The script compiles structure, manifest, Markdown, and Lanham results into `VALIDATION-RESULT.md` with sections:
  - Structure Check (issues/warnings)
  - Manifest Review (per manifest)
  - Markdown File Ratings (per file: formatting pass/fail, Lanham score, notes)
- Share the report with workshop owners so they can fix failing items.

## Troubleshooting
- If the script reports missing files, compare against the sample workshop hierarchy to identify gaps quickly.
- For Markdown failures, open the referenced file and revisit the relevant rule section in `references/markdown_rules.md`.
- When Lanham scores drop below 3, rewrite offending sentences using active verbs and concise phrasing before rerunning the validator.

## References
- `references/markdown_rules.md` - condensed LiveLabs markdown lint checklist.
- `references/lanham_guidelines.md` - scoring rubric for Richard Lanham style enforcement.
- Sample assets: `<livelabs-repo>/common/sample-livelabs-templates/sample-workshop`.

## Scripts
- `scripts/validate_workshop.py` - main validation entry point described above.
