# LiveLabs Workshop Author 26.5.3 Installation And Usage Guide

## What The Skill Can Do

- Create or update Oracle LiveLabs workshops from ideas, blogs, product docs, demos, notebooks, slide decks, web pages, or mixed source bundles.
- Scaffold a neutral LiveLabs workshop structure without requiring a GitHub repository, template repository, or sample workshop.
- Author markdown labs, build manifests, add FreeSQL runnable content when useful, and validate the output.
- Generate source traceability and workshop details stubs so authors can preserve provenance and LiveLabs setup metadata.
- Use bundled references, scripts, a starter template, and a visual explainer so the skill remains self-contained when installed from the ZIP.

## What Changed In 26.5.3

- Current installed skill name remains `livelabs-author`; current version is `26.5.3`.
- The release package now includes a stable skill folder at `livelabs-author/`.
- Screenshot capture and industry conversion remain outside this author skill. Use the dedicated screenshot and industry-conversion skills for those workflows.
- The skill includes `templates/workshop-template/` for a copyable starter workshop with loader-based `index.html` files and manifests.
- The skill includes `explainer/index.html` as a self-contained overview of the workflow, modes, structure rules, scripts, validation, and delivery contract.
- Source provenance is stricter: classify Oracle-owned/internal, external/non-Oracle, and unclear material before drafting.
- Embedded assets inside DOCX, PPTX, PDF, ZIP, notebooks, and exported sites must be classified separately from the parent file.
- External or unclear source material requires explicit current-request permission before planning, scaffolding, authoring, or recreating derived assets.
- The QA wrapper uses the bundled `scripts/validate_workshop.py` by default and still honors `WORKSHOP_VALIDATOR` as an override.

## Core Rules

- Keep workshop authoring focused on core LiveLabs content creation.
- Use dedicated screenshot, gamification, and industry-conversion skills when those tasks are needed.
- Ask for target duration and desired lab count before locking the outline.
- Prompt for `oracle-db-skills` when the workshop touches Oracle Database features.
- Record provenance in `TRACEABILITY.md` when source material drives the workshop.
- For external or unclear source material, continue only after the author confirms current approval from the source owner or author.
- Add learner-facing source acknowledgements only for external-facing public URLs that should be visible to learners.
- Avoid machine-specific paths in templates, examples, and output instructions.
- Validate generated workshops before final delivery.

## Release Files

- Skill source folder: `livelabs-author/`
- Current ready archive: `ready-to-deploy-archive/livelabs-workshop-author.zip`
- Versioned archive: `versions/livelabs-workshop-author-26.5.3.zip`
- Update manifest: `livelabs-author.update.json`

## Installation Process

Give Codex this prompt:

```text
Install the LiveLabs Workshop Author 26.5.3 skill from <path-to-livelabs-workshop-author-26.5.3.zip> into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` value `livelabs-author` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify that `VERSION` is `26.5.3`.
```

After installation, ask Codex to verify that:

- the installed folder is named `livelabs-author`
- `SKILL.md` contains `name: livelabs-author`
- `VERSION` contains `26.5.3`
- `agents/openai.yaml` is present
- `references/`, `scripts/`, `templates/workshop-template/`, and `explainer/index.html` are present

Then run the setup or upgrade helper from the installed skill folder:

```bash
bash scripts/setup_or_upgrade_skill.sh
```

## How To Prompt It

Start with `$livelabs-author` and give Codex the target path, source material, desired workshop duration, and desired lab count.

## What To Include In Your Request

- source materials such as docs, blogs, demos, notebooks, or product pages
- target workshop slug and output folder
- target duration and preferred lab count
- desired mode: `draft`, `publish-ready`, `how-to-guide`, or `fastlab`
- whether FreeSQL content, source traceability, or workshop details metadata is required
- whether any source material is external/non-Oracle or unclear, plus current permission confirmation when required
- whether Oracle Database technical validation should use `oracle-db-skills`
- validation expectations and known constraints

## Recommended Prompt Patterns

### Create A Workshop

```text
$livelabs-author create a publish-ready 60-minute LiveLabs workshop with 4 labs from this product brief in <new-workshop-folder>. Classify sources, create TRACEABILITY.md and WORKSHOP-DETAILS.md, include FreeSQL where useful, and run validation.
```

### Update Existing Workshop

```text
$livelabs-author update <workshop-root> with this new product scenario, preserve the existing lab order unless it conflicts with the new flow, refresh manifests, update source traceability, and rerun validation.
```

### Create From The Starter Template

```text
$livelabs-author use the bundled starter template to create <workshop-slug> in <target-parent-folder>, then replace the placeholder introduction and lab template with a short draft workshop.
```

### Add FreeSQL Content

```text
$livelabs-author add embedded FreeSQL content from this share URL to <workshop-root>, use the canonical LiveLabs iframe pattern, and validate the edited markdown.
```

## Common Pitfalls

- expecting screenshot capture from the lean author skill
- expecting industry conversion from the author skill
- hardcoding validator, template, or sample-workshop paths
- assuming a GitHub repository or existing LiveLabs template is required
- skipping target duration or lab-count confirmation
- using external or unclear source material without current source-owner approval
- treating embedded images, charts, datasets, code, or diagrams as automatically covered by the parent document
- skipping manifest validation
- letting source claims drift while rewriting workshop copy

## Expected Output From Codex

- workshop plan
- created or updated markdown files
- manifest changes
- `WORKSHOP-DETAILS.md` with short description, long description, outline, and prerequisites when generated
- validation result and remaining issues
- source-provenance, embedded-asset, permission, or assumption notes when source material is incomplete or requires approval

## Quick Checklist

- Embedded name is `livelabs-author`.
- Version is `26.5.3`.
- Package ZIP exists in `ready-to-deploy-archive/`.
- Versioned ZIP exists in `versions/`.
- Requested output folder is writable.
- External and unclear source permissions are confirmed before authoring.
- Output includes validation evidence.
- Output includes traceability when source material drives the workshop.

## Versioning History

- Version 26.5.3 - 06/17/26
  - Current self-contained authoring release with starter template, visual explainer, bundled validator default, stricter source and embedded-asset provenance gates, and stable ready/archive layout.
- Version 26.5.2 - 05/21/26
  - Initial published repository package recorded from the 26.5.2 skill artifact.
