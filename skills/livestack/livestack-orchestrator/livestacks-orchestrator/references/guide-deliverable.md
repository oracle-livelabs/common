# Guide Deliverable

Every production-ready LiveStacks bundle must include a sibling `guide/` folder that documents the real application in `stack/`.

## Required Shape

Author the guide with `$livestack-guide-builder` when it is installed. If that skill is missing, first run:

```bash
python3 scripts/ensure_livestack_guide_builder.py
```

If the install path is unavailable or fails, this skill still owns the guide deliverable. Use the same LiveStack runbook contract in this file and do not block the package on the absence of the sibling skill.

If the guide folder does not exist yet, run:

```bash
python3 scripts/scaffold_livestack_guide.py <solution-root>
```

`scaffold_livestack_guide.py` delegates to `livestack-guide-builder` and must create a production guide scaffold with scene labs, a Use Your Own Data workflow scene, a local-run/download lab, and desktop, sandbox, and tenancy workshop variants.

Minimum production guide structure:

- `guide/introduction/introduction.md`
- one `guide/scene-*/scene-*.md` lab per visible app scene or operator workflow
- one `guide/scene-*/scene-*.md` lab for the Use Your Own Data or dataset workflow when demo data is replaceable
- `guide/download-livestack/download-livestack.md`
- `guide/workshops/desktop/manifest.json`
- `guide/workshops/desktop/index.html`
- `guide/workshops/sandbox/manifest.json`
- `guide/workshops/sandbox/index.html`
- `guide/workshops/tenancy/manifest.json`
- `guide/workshops/tenancy/index.html`

`guide/conclusion/conclusion.md` is optional. Prefer a real final app scene when the application has one.

Do not edit `workshops/*/index.html`. Treat those files as read-only LiveLabs shell files owned by another repo and potentially invoked by external JavaScript. Only change manifests unless the user explicitly asks for workshop-shell edits.

## Runbook Rules

- Treat the running app and `stack/` runtime behavior as source of truth.
- Treat the guide as the demo runbook, not a generic reference document.
- Keep the guide scene-by-scene aligned to the visible app navigation and operator workflow.
- Use the public healthcare reference as the full production baseline for completeness, screenshot-backed tasks, local-run flow, and Use Your Own Data coverage: `https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/healthcare`
- Use the public finance and retail references as cross-checks to avoid copying healthcare-specific prose:
  - `https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/finance`
  - `https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/retail`
- If the same guide trees are available locally, use them only as faster mirrors of the public references.
- Write scene labs like an application user guide: tell the user what is happening, what to click or inspect, what opens, what changes on screen, and what expected outcome or business signal to notice.
- Keep raw API or `curl` examples as optional verification callouts rather than the main narrative.
- Include a self-contained local-run or download lab that explains how to start the distributed LiveStack from the real extracted bundle root, or from `stack/` only when the artifact actually uses that layout.
- For `guide/download-livestack/download-livestack.md`, use the actual distributable archive name, clean target-folder naming, extracted bundle layout, real ports, and real startup contract from the produced package. Do not invent an extra `stack/` path after extraction unless the archive truly contains one.
- Accept both LiveStack copy marker styles: paired `<copy>` markers before and after a command, and wrapped `<copy> ... </copy>` markers.
- In LiveStacks guides, use `## Credits & Build Notes` as the closing section. Do not add `## Acknowledgements`; if a validator objects, fix the validator profile or invocation rather than changing the guide contract.
- Prefer one scene or operator flow per lab when practical.

## Use Your Own Data Scene

Generated replaceable-data LiveStacks must include a full guide scene for the dataset workflow. Cover:

- opening the top-right `Use Your Own Data` control or equivalent
- active dataset state
- template ZIP download
- completed ZIP selection
- validate-only preview before import
- upload or replace behavior
- restore-demo preview and execute flow
- job/status feedback when exposed by the app
- synthetic, anonymized, or de-identified data expectations
- operator-admin boundary for destructive actions

This scene must have real screenshots for the main modal/workflow and callout/highlight captures for the controls the user clicks or reviews.

## Screenshot Contract

Capture screenshots from the real running app after the stack is healthy.

- Prefer automated capture with installed `$playwright` or `$webapp-testing` when available.
- Do not auto-install those screenshot helpers by default; browser and Node prerequisites vary by machine.
- Store raw capture artifacts and metadata under `output/guide-screenshots/`.
- Maintain both:
  - `output/guide-screenshots/inventory.json`
  - `output/guide-screenshots/inventory.md`
- Record for each capture:
  - file
  - view
  - caption
  - alt
  - note
- Copy selected screenshots into the relevant `guide/**/images/` folders.
- Use callouts, highlights, or tight crops for controls, tables, maps, modals, results, and Oracle Internals evidence.
- Write captions that prove the scenes are visually and behaviorally different. Name the scene-specific component or workbench, operator interaction, domain object, Oracle evidence, and workflow handoff instead of repeating generic "scene screenshot" language.
- For each scene screenshot or lab, verify Oracle Internals shows the scene-specific technical exhibit: `What's Happening`, capability badges, SQL/PLSQL, architecture/data-flow boxes, governance/security callout, and live evidence. For the `Use Your Own Data` lab, capture the dataset-governance version of Oracle Internals while the overlay is open.
- Do not rely on mockups or manually staged slides when a real app capture is possible.

## Validation

Before the LiveStack is called done:

- Run `python3 scripts/find_scaffold_markers.py <solution-root>` and clear guide blockers.
- Run `python3 scripts/validate_livestack_bundle.py <solution-root>` and clear guide-manifest, copy-marker, screenshot-inventory, runbook, or app-evidence errors.
- Run the `livestack-guide-builder` validator when available: `python3 ~/.codex/skills/livestack-guide-builder/scripts/validate_livestack_guide.py <solution-root>`.
- Run the official LiveLabs markdown validator against `guide/` when it is locally available.
- Confirm the guide reflects the current app scenes, local ports, and runtime topology.
- Confirm `download-livestack.md` uses the real portable archive filename, target-folder naming, extraction layout, and normal startup contract.
- Confirm `guide/workshops/desktop`, `guide/workshops/sandbox`, and `guide/workshops/tenancy` manifests are populated and their scene refs match the labs on disk.
- Confirm `guide/workshops/*/index.html` remains a valid LiveLabs shell.
- Confirm screenshot inventory failures are empty, or explicitly document unavoidable failures and their workaround.
- Confirm the Use Your Own Data guide scene exists and includes screenshots for the dataset manager workflow.
