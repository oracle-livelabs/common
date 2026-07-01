# LiveStack Guide Standard

Use the public healthcare guide as the richest production reference:
`https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/healthcare`

Use the public finance and retail guides as cross-checks for tone and reusable structure:

- `https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/finance`
- `https://github.com/oracle-livelabs/livestack/tree/main/aidatabaseindustrylivestack/retail`

If the same trees exist locally, treat them as convenience mirrors only. Do not make generated skill behavior depend on user-specific local paths, and do not copy industry-specific prose from any reference guide.

## Intent

A LiveStack guide is the field runbook for delivering the demo. It should help a user operate the real app scene by scene, not study a detached architecture document.

Each lab must make these points clear:

- what is happening in the scene
- what the user should click, inspect, compare, run, or validate
- what changes on screen
- what Oracle-backed evidence or application state supports the scene
- what business outcome, signal, or decision the user should remember

## Folder Shape

Core sandbox guide:

- `introduction/introduction.md`
- `scene-N-slug/scene-N-slug.md` for each visible scene or operator workflow
- `workshops/sandbox/index.html`
- `workshops/sandbox/manifest.json`

Production portable guide additions:

- `download-livestack/download-livestack.md` when a downloadable or local package exists
- `workshops/desktop/index.html`
- `workshops/desktop/manifest.json`
- `workshops/tenancy/index.html`
- `workshops/tenancy/manifest.json`
- `output/guide-screenshots/inventory.json`
- `output/guide-screenshots/inventory.md`

`conclusion/conclusion.md` is optional. Prefer a final scene lab when the application has a visible final workflow. Do not require a generic conclusion lab when the guide already ends at a real operator workflow.

## Required Scene Set

Generated LiveStacks should include these guide concepts when the app supports them:

- Welcome or orientation scene.
- Data Foundation scene.
- Command Center or operator overview scene.
- Capability-backed workflow scenes that match the app navigation.
- Ask Data, Select AI, natural-language SQL, or agent scene when present.
- `Use Your Own Data`, `Bring Your Own Data`, or equivalent dataset workflow scene when demo data is replaceable.
- Download/run lab when the bundle is distributed as a portable package.

The dataset workflow scene must cover:

- opening the dataset tool from the app chrome
- active dataset state
- template ZIP download
- completed ZIP selection
- validate-before-import behavior
- upload or replace behavior
- restore seeded demo data
- job/status behavior when the app exposes it
- safety expectations for synthetic, anonymized, or de-identified data

## Markdown Pattern

Introduction:

- H1 with the guide name.
- `## Introduction`.
- business pressure and demo purpose.
- `Estimated Demo Time: ...`.
- home or orientation screenshot when available.
- `### Objectives`.
- `### Prerequisites`.
- `## Demo Flow` or `## Workshop Flow`.
- `## Learn More`.
- `## Credits & Build Notes`.

Scene lab:

- H1 with scene number and title.
- `## Introduction`.
- `Estimated Time: ...` when known.
- real app screenshot near the introduction.
- `### Objectives`.
- `## Task 1: ...` and sequential task sections.
- numbered user actions under each task.
- callout/highlight screenshots where the user clicks, inspects, compares, or validates.
- prose that states the visible state change and expected outcome.
- Oracle evidence or business-signal explanation in the scene narrative.
- `## Credits & Build Notes`.

Download lab:

- H1 `# Download the LiveStack`.
- `## Introduction`.
- `Estimated Time: ...`.
- `### Objectives`.
- task to download the actual archive name.
- task to move the archive into a clean working directory before extraction.
- task to extract and enter the real extracted folder.
- task to copy or prepare `.env`.
- task to start with `podman compose up -d --build`.
- task to verify health and open the local app URL.
- task to stop with `podman compose down`.
- `## Credits & Build Notes`.

## Screenshots And Assets

Use real screenshots from the running app. Store selected guide images next to the lab that uses them under `images/`.

For production generated guides:

- include at least one screenshot per scene
- use callouts, highlights, or tightly framed captures for task-specific controls and evidence
- use meaningful alt text that names the UI, control, table, map, modal, or result
- keep raw capture files and metadata under `output/guide-screenshots/`
- copy only selected guide-ready images into `guide/**/images/`
- never use aspirational mockups when real app capture is possible

Screenshot inventory entries use:

- `file`
- `view`
- `caption`
- `alt`
- `note`

`file` must be relative to `output/guide-screenshots/`.

## Links And References

Use local relative paths for guide-owned images and markdown refs. Manifests must point to local markdown files with paths that resolve from their own `workshops/<variant>/` directory.

External documentation links are allowed in `Learn More` and help entries. Do not put raw URLs in task prose when a short markdown link is clearer.

## Copy Markers

Both LiveStack copy marker styles are valid:

```bash
<copy>
podman compose up -d
<copy>
```

```bash
<copy>
podman compose up -d
</copy>
```

Use copy markers only for commands users should run.

## Validation Expectations

Before handoff:

- run `scripts/validate_livestack_guide.py <guide-or-solution-root>`
- fix missing files, invalid manifests, broken local links, missing images, malformed copy markers, bad scene numbering, and screenshot inventory issues
- run bundle validation when the guide is part of a full LiveStack solution
- rerun validation after every guide or app-navigation change
