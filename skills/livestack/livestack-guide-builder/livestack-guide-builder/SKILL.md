---
name: livestack-guide-builder
description: Build, update, scaffold, and validate LiveStack demo guides that act as scene-by-scene runbooks for a working LiveStack application. Use when a LiveStack bundle needs a guide/ folder with desktop, sandbox, and tenancy workshop variants, real scene walkthrough labs, expected outcomes, screenshots, manifests, and portable download/run instructions aligned to the actual app.
---

# LiveStack Guide Builder

Create LiveStack guides only. This skill is not a generic LiveLabs workshop authoring tool.

## Core Rule

A LiveStack guide is the demo runbook for the application. Each scene lab must explain:

- what is happening in the scene
- what the user should click, run, inspect, or compare
- what changes on screen
- what expected outcome or business signal the user should take away

If the user provides a local reference guide or sets a portable reference through `LIVESTACK_GUIDE_REFERENCE`, compare against that guide when it is available. Otherwise, follow the bundled references in this skill.

## Required Guide Shape

Every guide must include:

- `guide/introduction/introduction.md`
- `guide/download-livestack/download-livestack.md`
- `guide/conclusion/conclusion.md`
- one `guide/scene-*/scene-*.md` lab per visible app scene or operator workflow
- `guide/workshops/desktop/index.html`
- `guide/workshops/desktop/manifest.json`
- `guide/workshops/sandbox/index.html`
- `guide/workshops/sandbox/manifest.json`
- `guide/workshops/tenancy/index.html`
- `guide/workshops/tenancy/manifest.json`

The three `workshops/*/index.html` files must remain canonical LiveLabs shell files. Do not customize them unless the user explicitly asks for shell changes.

## Workflow

1. Inspect the running app or app source to identify the visible scene sequence, scene labels, main buttons, expected state changes, and business outcomes.
2. If `guide/` is missing, scaffold it:
   - `python3 scripts/scaffold_livestack_guide.py <solution-root> --workshop-title "<title>"`
3. Author the guide as a runbook:
   - introduction: business story, prerequisites, workshop flow, learn-more links
   - scene labs: one scene or operator workflow per lab, with tasks, expected results, and `## Task N: Why this matters?`
   - download lab: actual archive name, extracted layout, compose startup, health route, app URL, clean shutdown
   - conclusion: final scene, outcome signals, stakeholder narrative
4. Use screenshots captured from the real app wherever possible. Put selected images under the relevant `guide/**/images/` folders.
5. Update all three manifests: `desktop`, `sandbox`, and `tenancy`. Their local scene references must match the scene labs on disk.
6. Validate:
   - `python3 scripts/validate_livestack_guide.py <guide-or-solution-root>`

## Authoring Rules

- Use `## Credits & Build Notes` as the closing section. Do not use `## Acknowledgements`.
- Use `Expected result:` after task sections where the user performs an action.
- Keep raw API or SQL checks optional; the main path should be what the demo user sees and does.
- Accept both copy marker styles:
  - paired LiveStack style: `<copy>` before and after a command
  - wrapped style: `<copy> ... </copy>`
- Do not fabricate screenshots. If capture was not possible, record the failure in the screenshot inventory and say what is missing.
- Do not let the guide drift from the app. If the app scene, button, route, or port changes, update the guide.

## References

- `references/livestack-guide-standard.md` for the detailed runbook pattern.
- `references/manifest-variants.md` for desktop, sandbox, and tenancy manifest rules.
- `assets/templates/workshops/index.html` for the canonical LiveLabs workshop shell copied into each workshop variant.

## Scripts

- `scripts/scaffold_livestack_guide.py` creates a LiveStack guide scaffold with required workshop variants.
- `scripts/validate_livestack_guide.py` validates guide structure, runbook sections, copy markers, image refs, manifests, and screenshot inventory when validating a full solution root.
