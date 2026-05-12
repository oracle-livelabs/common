# LiveStack Guide Standard

Use a user-provided reference guide or the path in `LIVESTACK_GUIDE_REFERENCE` as the canonical local example when one is available. If no reference path is provided, use this file as the portable baseline.

## Intent

A LiveStack guide is a runbook for delivering the demo. It should help a user operate the app scene by scene, not study a detached architecture document.

Each scene lab should answer:

- What is happening in this scene?
- What should the user interact with?
- What should visibly change?
- What business outcome, signal, or decision should the user understand?

## Folder Shape

Required:

- `introduction/introduction.md`
- `download-livestack/download-livestack.md`
- `scene-N-slug/scene-N-slug.md` for each visible scene or operator workflow
- `conclusion/conclusion.md`
- `workshops/desktop/{index.html,manifest.json}`
- `workshops/sandbox/{index.html,manifest.json}`
- `workshops/tenancy/{index.html,manifest.json}`

`workshops/*/index.html` should be the canonical LiveLabs shell. All three variants should use the same shell unless the user explicitly asks for a shell change.

## Markdown Pattern

Introduction:

- H1 with workshop name
- `## Introduction`
- `Estimated Demo Time: ...`
- screenshot of the home page when available
- `### Objectives`
- `### Prerequisites`
- `## Workshop Flow`
- `## Learn More`
- `## Credits & Build Notes`

Scene lab:

- H1 with scene number and title
- `## Introduction`
- `Estimated Time: ...`
- `### Objectives`
- `## Task 1: ...`
- numbered user actions
- screenshot or GIF from the real app
- `Expected result:`
- additional task sections as needed
- final `## Task N: Why this matters?`
- `## Credits & Build Notes`

Download lab:

- H1 `# Download the LiveStack`
- `## Introduction`
- `Estimated Time: ...`
- `### Objectives`
- download package task
- prepare working directory task
- `podman compose` startup task
- health check and app URL task
- clean shutdown task
- final `## Task N: Why this matters?`
- `## Credits & Build Notes`

Conclusion:

- H1 with outcome framing
- `## Introduction`
- `Estimated Time: ...`
- `### Objectives`
- final scene task
- outcome review task
- final `## Task N: Why this matters?`
- `## Credits & Build Notes`

## Copy Markers

Both LiveStack copy marker styles are valid:

- paired style:

```bash
<copy>
podman compose up -d
<copy>
```

- wrapped style:

```bash
<copy>
podman compose up -d
</copy>
```

Validators should accept both. New scaffolds should emit the paired style to match the reference guide.

## Screenshots

Prefer real screenshots or GIFs captured from the running app. Store selected images next to the lab that uses them under `images/`.

Every image must have meaningful alt text. Do not use mockups or aspirational screenshots when a real app capture is possible.
