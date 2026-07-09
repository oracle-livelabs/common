# Source Traceability

Use this reference when the workshop draws from blogs, docs, demos, decks, images, diagrams, datasets, code samples, or existing product material. This includes Oracle-owned/internal sources and external/non-Oracle sources. For source bundles such as DOCX, PPTX, Pages, PDF, ZIP, notebooks, or exported sites, classify embedded assets separately from the parent file.

## Goal

Keep claims, commands, scenario details, assets, and adapted code tied to their sources so the workshop remains defensible and publishable.

## Source Classes

Classify every source before drafting:

- `Oracle-owned/internal`: Oracle-authored public docs, Oracle blogs, Oracle-owned decks, internal Oracle-authored documents, Oracle-owned screenshots, and Oracle-created diagrams.
- `External/non-Oracle`: third-party blogs, vendor docs, community posts, public images, non-Oracle diagrams, external datasets, and external code samples.
- `Unclear`: partner-authored, customer-authored, third-party-hosted, mixed-owner, or ambiguous material until the user confirms ownership and usage rights.

Always track provenance. Require attribution and rights review for external or unclear sources. For Oracle-owned/internal material, record provenance for auditability, but do not add public-style attribution unless the source or user requires it.

External-source approval is a hard gate. If any source or embedded asset is external/non-Oracle or unclear, stop before planning, scaffolding, writing markdown, creating images, or producing derived artifacts. Ask the workshop author to confirm they have approval from the source owner or author to build a workshop from the material for this specific build. Continue only after explicit confirmation in the current user request or response. Do not rely on approval from earlier turns, prior runs, memory, or existing traceability files. Record the current approval in `TRACEABILITY.md`. After confirmation, add `Built with permission from the author(s).` to learner-facing acknowledgements for the external source.

Do not infer embedded asset rights from the parent file. An Oracle-owned deck can contain partner screenshots, customer logos, analyst charts, third-party icons, copied diagrams, or open-source code with separate terms. If origin or license is not explicit, classify the asset as unclear.

Do not expose confidential internal links, author names, file paths, or document details in learner-facing labs unless the user confirms they are approved for publication.

## What To Track

Track these items while authoring:

- major claims,
- commands and code blocks,
- images, screenshots, diagrams, logos, charts, and other visual assets,
- datasets and sample data,
- adapted code, quoted passages, or notebook material,
- linked media or externally hosted assets,
- environment assumptions,
- scenario notes,
- open questions that still need SME input,
- attribution or rights gaps,
- workshop-author approval for external or unclear sources.

## Minimal Traceability Table

Use this table while drafting:

| Workshop Area | Source | Owner / Source Class | Evidence Type | Used As | Approval / Attribution / Rights Notes |
| --- | --- | --- | --- | --- | --- |
| Lab 1 intro | Oracle blog URL | Oracle-owned/internal | claim | summarized | Provenance only; no third-party attribution needed |
| Task 3 SQL | product doc URL | Oracle-owned/internal | command | adapted | Adjusted schema names only |
| Lab 2 diagram | embedded image in deck | Unclear | image | reused | Stop until asset origin and source-owner approval are confirmed |
| Lab 2 reference chart | third-party URL | External/non-Oracle | chart | adapted | Stop until author confirms source-owner approval; attribution and rights review required |
| Lab 3 dataset | customer-provided file | Unclear | data | adapted | Stop until ownership and publication approval are confirmed |

## Runner Notification

Tell the user when:

- any external or unclear source or embedded asset requires current-build source-owner approval before workshop creation can continue,
- any external or unclear source needs attribution or rights review,
- an image, diagram, logo, chart, dataset, quoted passage, linked asset, or code sample cannot be safely reused,
- all sources appear Oracle-owned/internal and only provenance tracking is required,
- confidential Oracle-internal source details should stay out of learner-facing markdown.

## Learner-Facing Acknowledgements

In each lab's `## Acknowledgements` section:

- include a `Source` line only for an external-facing public URL,
- format public external/non-Oracle sources with confirmed permission as `* **Source** - [Source title](https://public-url). Built with permission from the author(s).`,
- format public Oracle-owned sources as `* **Source** - [Source title](https://public-url).`,
- do not list Oracle-internal, Oracle-owned private, local, SharePoint, iCloud, unpublished, or confidential sources in learner-facing acknowledgements,
- keep non-public provenance in `TRACEABILITY.md` only when auditability is needed.
