# QA Delivery Contract

Use this checklist before declaring the workshop ready.

## Required Delivery Items

Return:

- workshop root path,
- mode used,
- created and updated files,
- short description,
- long description,
- workshop outline,
- traceability summary when source material drove the workshop,
- FreeSQL summary,
- Oracle validation summary when `oracle-db-skills` was used,
- validator status,
- self-grade summary,
- unresolved SME or source gaps.

## QA Checklist

- Required markdown sections are present.
- Manifests point to real files.
- Image paths resolve.
- Image alt text is meaningful.
- FreeSQL links or embeds match the renderer.
- Prose is direct and defensible.
- Source-driven claims and commands are still defensible.
- Generated `index.html` preview pages still load the workshop through the LiveLabs loader.
- Learner-facing introductions focus on the task and outcome instead of describing the workshop's source prompt or article origin.
- `WORKSHOP-DETAILS.md` exists when the workshop was newly created or substantially updated.
- Short description, long description, and workshop outline match the final lab sequence and duration.
- Changed files reach a self-grade target of 4/5 or 5/5 when feasible. Flag any file that remains at 3/5.

## FreeSQL Summary

Summarize:

- which labs include FreeSQL content,
- whether the lab uses plain code, share links, buttons, or embeds,
- any examples that still need live verification.

## Unresolved Gaps

Be explicit about:

- missing SME confirmation,
- missing assets,
- commands not runtime-tested,
- files that still scored only 3/5 after revision,
- validator issues outside the edited surface.
