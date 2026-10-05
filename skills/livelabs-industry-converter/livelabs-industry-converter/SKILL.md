---
name: livelabs-industry-converter
description: Convert any existing Oracle LiveLabs workshop into an industry-specific variant from one simple prompt. Use when Codex needs to inspect a source workshop, infer lab order and manifest structure, map it to a target industry, rewrite the labs, run strict LiveLabs and prose checks, catch leftover source vocabulary, verify launch files, and return a QA summary.
---

# LiveLabs Industry Converter

Convert a source LiveLabs workshop into an industry-specific version without flattening it into a generic template. Preserve what the source workshop actually teaches, then make it feel native to the target industry.

## How To Use This

Ask in plain English. The user only needs to provide:
- target industry,
- source workshop path,
- optional company name,
- optional output path.

Example:

```text
Convert this workshop to the finance industry.
Source: /path/to/source/workshop
Output: /path/to/output/industries/finance
Company: Seer Equity
```

If `Output:` is missing, create a reasonable default beside the source workshop, usually under an `industries/<industry-slug>` path.

If `Company:` is missing, use credible industry-generic names and avoid over-branding the workshop.

## What This Skill Does Automatically

When this skill triggers, do the rest without asking for extra framework questions unless a real blocker exists.

1. Inspect the source workshop and treat it as canonical.
2. Detect lab order, manifest structure, shared assets, and launch flow.
3. Build a source-to-industry mapping that preserves functional equivalence.
4. Rewrite labs, manifests, schema names, sample data, IDs, statuses, screenshots references, and outputs.
5. Validate LiveLabs structure and launch files.
6. Validate prose quality and defensibility.
7. Compare the converted workshop against the source for fidelity, including section coverage, task coverage, screenshots, and unchanged generic content.
8. Scan for leftover source vocabulary and broken domain logic.
9. Repair failures until the workshop is structurally sound and the prose gate is clean.
10. After each repair pass, rerun a source-to-converted comparison to catch duplication, drift, or over-rewrite introduced by the repair itself.
11. Return the converted path plus a compact QA summary.

## Internal Operating Rules

Keep the user-facing interaction simple and keep the rigor inside the skill.

Default posture:
- preserve before rewriting,
- map before paraphrasing,
- copy the source structure unless a domain change requires a change,
- keep generic instructional prose close to the source,
- preserve screenshots and image references unless they are wrong or must be renamed for domain fidelity,
- normalize each lab intro into one canonical block instead of layering repair text on top of source text,
- treat validator repair as a merge into the restored source, not as a second authoring pass.

Before rewriting, load these references:
- `references/livelabs-rules.md`
- `references/grading-rubric.md`
- `references/domain-conversion-checklist.md`
- `references/prose-gate.md`
- `references/launch-check.md`

Use these templates as working artifacts when the task is large enough to benefit from them:
- `templates/workshop-plan-template.md`
- `templates/qa-report-template.md`
- `templates/file-mapping-template.md`

## Output Contract

Return a concise result that includes:
- converted workshop path,
- created or updated files,
- domain mapping summary,
- source-fidelity summary,
- QA summary,
- unresolved SME or source-workshop gaps.

Do not expose internal grading mechanics unless the user asks for them.

## Guardrails

- Preserve the source workshop's teaching flow, technical architecture, and complexity.
- Preserve functional equivalence, not surface vocabulary.
- Preserve source wording and sentence structure wherever the content is generic and not domain-specific.
- Rewrite only the parts that need domain conversion, technical renaming, or validator repair.
- Preserve source section order, headings, task count, explanatory depth, and examples unless a source defect forces a repair.
- Preserve source screenshots, image references, and asset coverage. Do not silently drop images, screenshots, or visual callouts.
- Preserve generic labs with minimal edits. If a lab is mostly tooling or product setup, convert only the domain-specific nouns and keep the rest close to the source.
- Keep only one time line per file. Do not leave both `Estimated Lab Time:` and `Estimated Time:` in the converted lab.
- Keep only one objectives section per file. If LiveLabs requires `### Objectives`, merge the source objective content into that section instead of leaving both `### Objective:` and `### Objectives`.
- When fidelity and validator formatting conflict, repair the existing source section instead of appending a new section, note, or heading.
- After validator repairs, run a duplicate-content pass for repeated headings, repeated intro paragraphs, repeated notes, repeated code blocks, repeated task text, and repeated metadata lines.
- Do not treat matching line counts, present image assets, or a passing validator run as sufficient proof of fidelity by themselves.
- After a source-faithful rebuild, rerun a strict side-by-side review of each updated lab before delivery.
- Do not invent agent layers, memory systems, approvals, or branching that the source workshop does not contain.
- Do not remove important loops, thresholds, or escalation logic.
- Do not leave source-domain nouns, statuses, IDs, screenshots, or tool names behind.
- Do not ship prose that sounds generic, overhyped, or unsupported.
- Do not mark the workshop complete if LiveLabs rules, launch checks, or prose checks still fail.
