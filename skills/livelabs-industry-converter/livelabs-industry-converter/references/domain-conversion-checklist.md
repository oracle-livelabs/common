# Domain Conversion Checklist

Use this checklist before and during rewriting.

## Extract The Source Workshop First

Record these items from the source workshop before renaming anything:
- workshop title and learner promise,
- lab order and dependencies,
- section order and heading structure inside each lab,
- task count and step count inside each task,
- personas and user roles,
- core entities and business objects,
- tables, views, APIs, JSON payloads, files, and artifacts,
- statuses, enums, and ID formats,
- workflow, routing, branching, approvals, and escalation logic,
- memory, precedent, governance, compliance, or audit logic when present,
- dashboards, reports, notebooks, PDFs, emails, or other output artifacts,
- screenshots, image references, image filenames, and visual callouts,
- generic product-setup or tooling prose that should stay close to the source,
- manifests, launch files, shared labs, and variant folders.

If an item is absent, record it as absent. Do not invent it later.

## Build The Mapping

Map each source element to a target-industry equivalent:
- personas,
- business objects,
- schema and object names,
- status values,
- identifiers,
- sample records,
- screenshots and artifact labels,
- reports and dashboard labels,
- approval or exception terms.

Preserve functional equivalence, not surface vocabulary.

## Rewrite With Minimal Necessary Change

- Keep source sentence structure when the sentence is generic, product-level, or setup-oriented.
- Rewrite prose only when domain nouns, examples, IDs, statuses, screenshots labels, or business meaning actually need conversion.
- If a lab is mostly product setup, tooling setup, or generic Oracle feature explanation, keep it very close to the source.
- Do not shorten the introduction, conclusion, or lab explanations unless the source is clearly redundant or broken.
- Do not reduce task count, merge sections, or collapse walkthrough steps unless the source itself is defective.
- If validator repair is needed, edit the restored source section in place. Do not append a second explanatory block, second note, second objective section, or second metadata line.

## Preserve The Source

- Keep the same learning flow.
- Keep the same technical progression.
- Keep the same branching and escalation complexity.
- Keep the same artifact categories.
- Keep the same constraints unless the target industry requires an equivalent stricter form.
- Keep the same section coverage and explanatory depth.
- Keep the same screenshots and image coverage.
- Keep the same generic examples when they are not industry-bound.
- Keep one canonical intro structure per file. Preserve the source intro content, but do not duplicate time lines, objectives, or prerequisite framing during validator repair.

## Do Not Introduce New Patterns

Do not add:
- multi-agent behavior that the source does not contain,
- memory systems that the source does not contain,
- governance layers that the source does not contain,
- extra approvals, personas, or routing stages that change the lesson.

## Residue Checks

Before delivery, scan for leftover source-domain:
- nouns,
- role names,
- company names,
- table names,
- status labels,
- IDs,
- file names,
- screenshot names,
- sample data values,
- report titles,
- dashboard labels.

If residue remains, fix it or explain why it must remain for technical fidelity.

## Fidelity Checks

Before delivery, compare source and converted files for:
- missing sections,
- missing tasks,
- missing numbered steps,
- shortened introductions or conclusions,
- removed screenshots or images,
- unnecessary rewrites in generic setup labs,
- unnecessary sentence-level paraphrasing where no domain change was needed,
- duplicated time lines such as both `Estimated Lab Time:` and `Estimated Time:`,
- duplicated objective sections such as both `### Objective:` and `### Objectives`,
- repeated headings, repeated intro paragraphs, repeated notes introduced by repair passes,
- repeated code blocks or repeated task prose,
- body-level duplication introduced after a validator or prose-repair pass.

If fidelity drift appears, restore the source structure first, then apply only the required domain edits. Do not accept line-count similarity, image presence, or validator success as a substitute for this comparison.
