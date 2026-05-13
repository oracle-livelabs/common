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

`scaffold_livestack_guide.py` delegates to `livestack-guide-builder` and must create the required `desktop`, `sandbox`, and `tenancy` workshop variants.

Minimum guide structure:

- `guide/introduction/introduction.md`
- `guide/download-livestack/download-livestack.md`
- `guide/conclusion/conclusion.md`
- one `guide/scene-*/scene-*.md` lab per visible app scene or operator workflow
- `guide/workshops/desktop/manifest.json`
- `guide/workshops/desktop/index.html`
- `guide/workshops/sandbox/manifest.json`
- `guide/workshops/sandbox/index.html`
- `guide/workshops/tenancy/manifest.json`
- `guide/workshops/tenancy/index.html`

Do not edit `workshops/*/index.html`. Treat those files as read-only canonical LiveLabs shell files owned by another repo and potentially invoked by external JavaScript. Only change manifests unless the user explicitly asks for workshop-shell edits.

## Runbook Rules

- Treat the running app and `stack/` runtime behavior as source of truth.
- Treat the guide as the demo runbook, not a generic reference document.
- Keep the guide scene-by-scene aligned to the visible app navigation and operator workflow.
- When a canonical local LiveStack guide exists, use it as the style and cadence baseline before applying solution-specific deltas.
- Write scene labs like an application user guide: tell the user what is happening, what to click or inspect, what opens, what changes on screen, and what expected outcome or business signal to notice.
- Keep raw API or `curl` examples as optional verification callouts rather than the main narrative.
- Include a self-contained local-run or download lab that explains how to start the distributed LiveStack from the real extracted bundle root, or from `stack/` only when the artifact actually uses that layout.
- For `guide/download-livestack/download-livestack.md`, use the actual distributable archive name, clean target-folder naming, extracted bundle layout, real ports, and real startup contract from the produced package. Do not invent an extra `stack/` path after extraction unless the archive truly contains one.
- Accept both LiveStack copy marker styles: paired `<copy>` markers before and after a command, and wrapped `<copy> ... </copy>` markers.
- In LiveStacks guides, use `## Credits & Build Notes` as the closing section. Do not add `## Acknowledgements`; if a validator objects, fix the validator profile or invocation rather than changing the guide contract.
- Prefer one scene or operator flow per lab when practical.

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
- Copy the selected screenshots into the relevant `guide/**/images/` folders.
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
- Confirm all `guide/workshops/*/index.html` files still match the canonical LiveLabs shell from `livestack-guide-builder`.
- Confirm screenshot inventory failures are empty, or explicitly document unavoidable failures and their workaround.
