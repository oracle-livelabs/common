---
name: outbound-content-rules
description: Team writing standards for drafting, revising, and grading outbound PM content with concise, active, defensible language. Use when Codex must produce or evaluate technical marketing content (summaries, launch messaging, web copy, narratives, or AI-generated drafts) and enforce Lanham-style prose tightening, lard-factor reduction, and layered quality checks.
---

# Outbound Content Rules

## Workflow
1. Identify task mode: `draft`, `revise`, `grade`, or `shorten`.
2. Read `references/ai-generated-content-guide.md` as the baseline style and accuracy policy.
3. Read `references/grading.md` when the user asks for grading or scorecards.
4. Read `references/lanham.md` when the user asks for tighter prose or Lanham-style edits.
5. Read `references/lard.md` when the user asks for word-count reduction examples or lard factor.
6. Apply constraints, then produce output in the format the user requested.
7. Report any rule conflicts explicitly before continuing.

## Core Constraints
- Write concise, direct prose with active voice and strong verbs.
- Remove vague marketing adjectives, filler, and preposition-heavy phrasing.
- Keep claims factual, testable, and defensible.
- Prefer problem -> solution -> outcome flow when narrative improves clarity.
- Do not use words with roots or synonyms of `guarantee`, `insure`, `ensure`, or `assure`.
- Avoid weak patterns like `<adverb> <weak verb> <noun clause> <gerund> <noun clause>` and `__ weak-verb __, gerund __`.

## Grading Mode
1. Evaluate layers in the exact order listed in `references/grading.md`.
2. Stop at the first layer that scores below `A`.
3. Use markdown output with one `##` section per evaluated layer.
4. For grades `A` or better, provide one-line affirmation.
5. For grades below `A`, list faulty sentences verbatim and provide explicit rewrites.

## Revision Mode
1. Apply Lanham Paramedic Method from `references/lanham.md`.
2. Replace weak verbs with concrete action verbs.
3. Reduce word count without losing meaning.
4. Keep paragraphs and sentence rhythm readable.

## Lard-Factor Mode
1. Use output format from `references/lard.md` when asked for reduction examples.
2. Compute lard factor as:
`LF = ((w0 - w1) / w0) * 100%`
3. Report original sentence, rewritten sentence, word counts, and `LF`.

## References
- `references/ai-generated-content-guide.md`
- `references/grading.md`
- `references/lanham.md`
- `references/lard.md`
