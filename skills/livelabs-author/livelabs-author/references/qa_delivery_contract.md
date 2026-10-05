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
- source classification summary: Oracle-owned/internal, external/non-Oracle, and unclear,
- embedded asset classification summary for source bundles, including images, screenshots, diagrams, logos, charts, datasets, code, quotes, and linked media,
- attribution summary, including whether external or unclear sources need rights review,
- external-source approval summary, including the workshop author's explicit current-build confirmation when external or unclear sources were used,
- FreeSQL summary,
- Oracle validation summary when `oracle-db-skills` was used,
- validator status,
- self-grade summary,
- unresolved SME, source, attribution, source-approval, or rights-review gaps.

## QA Checklist

- Required markdown sections are present.
- Manifests point to real files.
- Image paths resolve.
- Image alt text is meaningful.
- FreeSQL links or embeds match the renderer.
- Prose is direct and defensible.
- Source-driven claims, commands, images, diagrams, logos, charts, datasets, quoted passages, linked media, and adapted code are still defensible.
- Oracle-owned/internal source provenance is recorded without exposing confidential internal details in learner-facing markdown.
- External and unclear sources or embedded assets have recorded workshop-author confirmation of source-owner approval for the current build before any derived workshop artifacts are created.
- External and unclear sources have attribution notes or are flagged for rights review before publication.
- Learner-facing `Source` links appear only for external-facing public URLs.
- Confirmed external/non-Oracle public source acknowledgements include `Built with permission from the author(s).`
- Non-public Oracle, local, SharePoint, iCloud, unpublished, and confidential sources are omitted from learner-facing acknowledgements.
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
