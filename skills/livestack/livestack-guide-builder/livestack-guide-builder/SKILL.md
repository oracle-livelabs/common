---
name: livestack-guide-builder
description: Build, update, scaffold, and validate LiveStack demo guides that act as scene-by-scene runbooks for a working LiveStack application. Use when a LiveStack bundle needs a guide/ folder with desktop, sandbox, and tenancy workshop variants, real scene walkthrough labs, expected outcomes, screenshots, manifests, and portable download/run instructions aligned to the actual app.
---

# LiveStack Guide Builder

Create LiveStack guides only. This skill is not a generic LiveLabs workshop authoring tool.

## Use When

Use this skill when a LiveStack bundle needs a `guide/` tree, runbook labs, workshop manifests, real screenshots, screenshot inventory, download/run instructions, or validation.

Expected inputs:

- solution root or guide root
- app scene list, running app URL, and main user workflow
- package/archive name when a portable LiveStack is distributed
- screenshot capture source or explanation for missing captures

Expected output:

- `guide/introduction/introduction.md`
- one `guide/scene-N-slug/scene-N-slug.md` lab per visible scene or operator workflow
- a full `Use Your Own Data` / dataset workflow scene when generated app data is replaceable
- `guide/workshops/sandbox/{index.html,manifest.json}`
- optional `download-livestack`, `desktop`, and `tenancy` variants when the LiveStack is portable or cloud-tenancy based
- `output/guide-screenshots/{inventory.json,inventory.md}` when validating a full solution root

A LiveStack guide is the demo runbook for the application. Each scene lab must explain:

- what is happening in the scene
- what the user should click, run, inspect, or compare
- what changes on screen
- what expected outcome or business signal the user should take away

Use the public healthcare guide as the richest production reference:
`https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/healthcare`

Use public sibling guides as cross-checks when needed:

- `https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/finance`
- `https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/retail`

If matching local checkouts are available, use them as faster mirrors of the public references. Do not depend on user-specific local paths, and do not copy healthcare, finance, or retail domain prose into generic output.

## Workflow

1. Inspect the source material, app source, and running app to identify industry, scenario, audience, prerequisites, visible scene sequence, main buttons, expected state changes, Oracle evidence, and business outcomes.
2. If `guide/` is missing, scaffold it:
   - `python3 scripts/scaffold_livestack_guide.py <solution-root> --workshop-title "<title>"`
3. Author the guide as a runbook:
   - introduction: business pressure, runbook purpose, prerequisites, demo flow, learn-more links
   - scene labs: one scene or operator workflow per lab, with numbered tasks, real screenshots, callout/highlight captions, state changes, Oracle evidence, and outcome prose
   - Use Your Own Data lab: dataset tool entry, active dataset state, template download, ZIP selection, validation, upload/replace, restore-demo, job/status behavior, and data-safety expectations
   - download lab when portable: actual archive name, extracted layout, compose startup, health route, app URL, clean shutdown
4. Capture screenshots from the real app. Put selected callout/highlight screenshots under the relevant `guide/**/images/` folders and maintain screenshot inventory under `output/guide-screenshots/`.
5. Update manifests. Every local scene reference must match labs on disk. Keep `workshops/*/index.html` as the LiveLabs shell; do not customize it unless the user explicitly asks.
6. Validate and fix failures:
   - `python3 scripts/validate_livestack_guide.py <guide-or-solution-root>`

## Authoring Rules

- Use `## Credits & Build Notes` as the closing section. Do not use `## Acknowledgements`.
- Prefer natural outcome prose after task sections. `Expected result:` is allowed but not required when the outcome is already stated clearly.
- Keep raw API or SQL checks optional; the main path should be what the demo user sees and does.
- Accept both copy marker styles:
  - paired LiveStack style: `<copy>` before and after a command
  - wrapped style: `<copy> ... </copy>`
- Do not fabricate screenshots. If capture was not possible, record the failure in the screenshot inventory and say what is missing.
- Do not let the guide drift from the app. If the app scene, button, route, or port changes, update the guide.
- Do not copy healthcare, finance, or retail domain prose into generic templates. Reuse their structure, cadence, and completeness only.

## References

- `references/livestack-guide-standard.md` for the detailed runbook pattern, screenshots, BYOD, and markdown rules.
- `references/manifest-variants.md` for sandbox, desktop, and tenancy manifest rules.

## Scripts

- `scripts/scaffold_livestack_guide.py` creates a LiveStack guide scaffold with scenes, BYOD workflow, portable-run lab, and workshop variants.
- `scripts/validate_livestack_guide.py` validates guide structure, runbook sections, task/scene numbering, copy markers, image refs, internal links, manifests, BYOD coverage, and screenshot inventory when validating a full solution root.
