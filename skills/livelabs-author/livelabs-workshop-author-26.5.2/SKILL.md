---
name: livelabs-author
description: Create or update Oracle LiveLabs workshops from ideas or source materials such as blogs, product docs, web pages, notebook files, PowerPoint decks, demos, or mixed source bundles. Use when you need a lean core skill that can start from source-only inputs, scaffold workshop structure, author markdown, optionally add FreeSQL runnable content, and validate against LiveLabs markdown rules.
---

# LiveLabs Workshop Author 26.5.2

Turn rough workshop ideas and source material into publish-ready LiveLabs workshops with a smaller, smoother core workflow. This version removes screenshot capture and industry conversion responsibilities from the author skill itself. Use the dedicated screenshot and industry-conversion skills when those tasks are needed.

Current skill version: `26.5.2`

This skill is intentionally self-contained. If someone downloads only this skill as a zip, the bundled `references/` and `scripts/` folders still provide the guidance and helpers needed to plan, author, validate, and package a LiveLabs workshop. The QA wrapper uses the bundled `scripts/validate_workshop.py` by default and still honors `WORKSHOP_VALIDATOR` as an override.
The skill also includes a neutral starter template at `templates/workshop-template/` so users can copy a full workshop skeleton, including `index.html` and manifest files, without any machine-specific path mapping.
The skill does not require a GitHub repository, an existing LiveLabs template repository, or a sample workshop repository. If the user has only a writable destination folder plus source material or a clear idea, the skill can still create a workshop that follows the bundled LiveLabs structure and validation rules.

## Visual explainer

A self-contained HTML explainer is included at `explainer/index.html`. Open it in Codex or a browser to show how this skill works, including the compact overview, workflow, modes, workshop structure, markdown rules, FreeSQL handling, bundled scripts, validation and repair order, and delivery contract.

## Quick Start
- Gather provided source links and artifacts: ideas, blogs, product pages, docs, web pages, diagrams, commands, screenshots, notebook files, slide decks, PowerPoint files, and sample SQL.
- Ask how long the workshop should be before you draft the lab plan. Use that answer to size the lab count, per-lab depth, and setup overhead.
- Ask how many labs the user wants before you lock the outline. If they do not know, propose a lab count that fits the requested duration.
- If the workshop touches Oracle Database features, prompt the user to load `oracle-db-skills` before finalizing the workshop so you can validate technical accuracy, terminology, SQL, and feature behavior.
- Choose the best fit mode from `references/mode_selection.md`.
- If you need a prompt shape, start from `references/prompt_templates.md`.
- Keep the skill itself free of hard-coded author or machine-specific local paths. Use neutral placeholders in examples and docs. When the user is generating a workshop, they may still provide any real output path they want.
- Run the setup or upgrade helper after installation or before sharing:
  - `bash scripts/setup_or_upgrade_skill.sh`
- Scaffold the workshop root:
  - `bash scripts/scaffold_workshop.sh <target-parent-dir> <workshop-slug>`
  - Optional flags: `--title`, `--help`, `--variants`, `--no-need-help`
  - Add `--sample /path/to/sample-workshop` only when you explicitly want to clone an existing sample.
  - If the user wants a copyable starter instead of generated output, use the bundled files in `templates/workshop-template/`.
  - After scaffolding, open one generated `workshops/<variant>/index.html` and confirm it is the LiveLabs loader, not a placeholder stub.
  - Run `bash scripts/smoke_test_preview.sh <workshop-root> [variant]` before you start writing labs.
- Create lab folders and markdown stubs:
  - `bash scripts/create_lab_stub.sh <workshop-root> <lab-slug> <lab-title> [estimated-time]`
- Create a source traceability stub when the workshop is based on outside material:
  - `bash scripts/create_traceability_stub.sh <workshop-root>`
  - Use [source_traceability.md](references/source_traceability.md) for the expected traceability fields.
- Create a workshop details stub for reusable metadata:
  - `bash scripts/create_workshop_details_stub.sh <workshop-root>`
- Build or refresh a manifest from the intended lab sequence:
  - `python3 scripts/render_manifest.py <workshop-root> <variant> <workshop-title> <lab-slug=Lab Title> [...]`
- If the workshop teaches SQL or database tasks, review:
  - `references/freesql_authoring.md`
  - `references/freesql_decision_matrix.md`
  - `references/freesql_site_observations.md`
  - `python3 scripts/render_freesql_block.py <share-url> [--mode link|button|embed]`
- Run workshop QA:
  - `bash scripts/run_workshop_qa.sh <workshop-root>`
  - The wrapper uses the bundled `scripts/validate_workshop.py` unless `WORKSHOP_VALIDATOR` is set.

## Modes

Choose one mode up front so the output matches the user's need:

- `draft`: fastest path from source to working markdown skeleton.
- `publish-ready`: complete markdown, manifest coverage, FreeSQL decisions when relevant, QA pass, and cleanup.
- `how-to-guide`: procedural workshop that teaches authors how to build or publish something.
- `fastlab`: narrow scope, fewer labs, tighter setup, short runtime.

Use `references/mode_selection.md` for selection rules and delivery expectations.

## Workflow

### 1. Translate Source Content into a Lab Plan
- Confirm the target workshop length up front. If the user did not provide it, ask before you finalize scope.
- Confirm the desired lab count up front. If the user did not provide it, ask before you finalize scope.
- If the workshop is Oracle-related, ask whether the user wants to load `oracle-db-skills` for technical validation before you finalize the draft.
- Convert the input materials into:
  - learner outcome,
  - audience assumptions,
  - environment requirements,
  - target duration,
  - requested lab count,
  - short description,
  - long description,
  - workshop outline,
  - ordered labs,
  - per-lab tasks,
  - FreeSQL opportunities.
- Do not require a pre-existing workshop as input. A blog post or product doc is enough to produce a credible first draft.
- Do not require a GitHub repository, a pre-existing workshop repository, or a template repository as input. A writable folder plus source material is enough to produce a credible first draft.
- Match the workshop shape to the requested duration. Short workshops need fewer labs and less setup; longer workshops can carry more context, checkpoints, and optional exercises.
- Match the lab count to the requested duration. If the user asks for fewer labs, collapse the flow without losing the core build and validation steps.
- Always write a concise workshop short description, a fuller long description, and a workshop outline that maps to the final lab plan.
- Save those metadata fields in a reusable root file so the user can paste them into LiveLabs workshop details without reconstructing them later.
- Keep each lab task-focused and action-oriented.
- Map claims and commands back to the source material.
- Treat ideas, blogs, notebooks, decks, and docs as valid starting points. Translate them into a learner workflow instead of mirroring their original format.
- Use:
  - `references/authoring_workflow.md`

### 2. Create the Workshop Skeleton
- Use `scripts/scaffold_workshop.sh` to generate a working LiveLabs layout with loader-based `index.html` files and starter manifests.
- Use `scripts/create_lab_stub.sh` to create each lab folder with required sections and an `images/` folder.
- Use `scripts/create_workshop_details_stub.sh` to create a root metadata file for workshop setup fields.
- Keep all folder and file names lowercase with dashes.
- Preserve the LiveLabs root layout from `references/workshop_structure.md`.
- Immediately verify the generated `index.html`, manifest tutorial order, and introduction metadata before you draft the labs.

### 3. Author Markdown Labs
- Follow the section contract for every markdown lab:
  - one H1 as the first non-empty line,
  - `## Introduction`,
  - `### Objectives`,
  - `Estimated Time:` or `Estimated Workshop Time:`,
  - `## Acknowledgements`.
- Use `## Task ...: ...` headers for guided steps.
- Indent nested text, images, lists, and code blocks by 4 spaces inside numbered steps.
- Use meaningful alt text on every image.
- Avoid HTML anchors and invalid embed syntax.
- Use direct, factual language and cut filler early.
- Write the introduction around the learner problem, environment, and outcome. Do not say that the workshop was created from a blog post, idea, source article, or prompt.
- Use `references/markdown_rules.md` as the structural checklist.

### 4. Add FreeSQL Content
- Use FreeSQL when runnable SQL, PL/SQL, Quick SQL, or JavaScript will materially help the learner.
- Decide between plain code, share link, button, or embed with:
  - `references/freesql_authoring.md`
  - `references/freesql_decision_matrix.md`
  - `references/freesql_site_observations.md`
- Generate markdown or HTML blocks from a known FreeSQL share URL with:
  - `python3 scripts/render_freesql_block.py <share-url> [--mode link|button|embed]`
- If the workshop uses FreeSQL and raw HTML is allowed, default to an embedded editor unless the user explicitly asks for a link or button.
- If the user asks for FreeSQL to appear inside the workshop, inline, embedded, or in-frame, use an embedded editor instead of a link or button.
- If the user tries to use FreeSQL for vector embedding generation, warn that FreeSQL does not support it and do not present FreeSQL as the runnable environment for that step.
- When using an embedded editor, prefer the canonical LiveLabs iframe pattern that uses `class="freesql-embed"` and `data-freesql-src="..."`.

### 5. Build Manifests
- Build or refresh `workshops/<variant>/manifest.json` with:
  - `python3 scripts/render_manifest.py <workshop-root> <variant> <workshop-title> <lab-slug=Lab Title> [...]`
- Keep local filenames relative and common labs on approved URLs.
- Keep `index.html` present in each workshop variant folder.
- Use `references/workshop_structure.md` for folder and manifest expectations.

### 6. Tighten Prose
- Review drafts against:
  - `references/ai-generated-content-guide.md`
  - `references/lanham.md`
  - `references/lanham_guidelines.md`
  - `references/lard.md`
- Rewrite weak, vague, or inflated sentences before the validation pass.
- Self-grade the changed files before delivery and aim for 4/5 or 5/5 prose quality. Do not ship below 3/5 without calling out the gap explicitly.

### 7. Validate and Repair
- Run:
  - `bash scripts/run_workshop_qa.sh <workshop-root>`
- For faster iteration on edited markdown only, run:
  - `bash scripts/run_workshop_qa.sh <workshop-root> --files introduction/introduction.md lab-a/lab-a.md`
- Resolve failures in this order:
  1. Missing required sections and headers.
  2. Task header format and ordered-list indentation.
  3. Image paths, alt text, image naming, and `<copy>` balance.
 4. FreeSQL links, buttons, or embeds that do not fit the renderer.
 4a. If the user asked for an embed, confirm the final lab contains an iframe-based embed rather than a launch-only affordance.
  5. Time fields and acknowledgements.
  6. Wordy prose and unsupported claims.
  7. Preview issues caused by bad loader pages, missing local assets, or broken relative paths.

### 8. Package Delivery
- Return:
  - workshop root path,
  - generated and updated files,
  - chosen mode,
  - short description,
  - long description,
  - workshop outline,
  - QA summary,
  - unresolved SME gaps.
- Include a brief self-grade for the changed files and note any file below 4/5.
- If `oracle-db-skills` was used, include a short Oracle technical-validation summary.
- Use `references/qa_delivery_contract.md` as the final output checklist.

## References
- `references/authoring_workflow.md` for converting source materials into a lab blueprint.
- `references/oracle_validation.md` for prompting and using `oracle-db-skills` on Oracle-related workshops.
- `references/workshop_structure.md` for required folder, manifest, and file layout.
- `references/markdown_rules.md` for validator-aligned markdown constraints.
- `references/freesql_authoring.md` for adding runnable FreeSQL content.
- `references/freesql_decision_matrix.md` for choosing between code blocks, links, buttons, and embeds.
- `references/freesql_site_observations.md` for current FreeSQL behavior and caveats.
- `references/mode_selection.md` for choosing the right authoring mode.
- `references/prompt_templates.md` for playground-ready prompts.
- `references/qa_delivery_contract.md` for final QA and delivery expectations.
- `references/ai-generated-content-guide.md` for concise, defensible AI-assisted writing.
- `references/lanham.md` for the Lanham paramedic method.
- `references/lanham_guidelines.md` for prose scoring and revision cues.
- `references/grading.md` for formal evaluation output when requested.
- `references/lard.md` for word-count reduction examples.

## Scripts
- `scripts/setup_or_upgrade_skill.sh` to mark this release as `26.5.2`, scan for older author-skill installs, and optionally archive them as `26.5`.
- `scripts/scaffold_workshop.sh` to create a clean workshop scaffold from the canonical sample.
- `scripts/smoke_test_preview.sh` to confirm that a generated workshop variant opens with the LiveLabs loader and starter manifest.
- `scripts/create_lab_stub.sh` to create lab folders, image folders, and markdown stubs with required sections.
- `scripts/create_traceability_stub.sh` to create a starter `TRACEABILITY.md` for source-backed workshops.
- `scripts/create_workshop_details_stub.sh` to create a starter `WORKSHOP-DETAILS.md` with short description, long description, outline, and prerequisites sections.
- `scripts/render_manifest.py` to generate a manifest from an ordered lab list.
- `scripts/render_freesql_block.py` to render a FreeSQL link, button, or iframe block from a share URL.
- `scripts/run_workshop_qa.sh` to run local workshop QA and summarize the report path.
- `scripts/validate_workshop.py` as the bundled workshop validator used by the QA wrapper.
