# Prompt Ideas

## 1. Intake And Scope Prompt

Use this before generating the first page:

```text
You are designing a Confluence page in storage format.

Task:
- Determine the real scope of the page
- Identify the primary audience
- Identify the decisions or actions this page should support
- Identify which content should be visible by default vs collapsed

Return:
1. page objective
2. audience
3. top-level sections
4. recommended use of panels, tabs, expands, and tables
5. likely risks if the page is overbuilt or underbuilt
```

## 2. First-Draft Architecture Prompt

Use this to produce the page plan before full markup:

```text
Design a Confluence page architecture for the subject below.

Requirements:
- prioritize a summary-first reading path
- use a landing band with mission, scope, and TOC when the page is complex
- add an at-a-glance panel row when multiple audiences, outputs, or decision uses exist
- create parent sections where multiple subsections answer different questions
- create one tabbed framework section when the same subject needs multiple valid views
- use tabs for alternate views of the same content
- use expandable sections for dense reference material
- avoid duplicate explanation across sections

Return:
1. page outline
2. purpose of each section
3. what remains visible
4. what is collapsed
 5. where tabs, panel rows, and expandable sections add the most value
 6. where follow-up customization is most likely
```

## 3. Storage-Format Generation Prompt

Use this when converting the plan into Confluence markup:

```text
Generate Confluence storage-format markup for the approved page outline.

Rules:
- keep the top reading path concise
- use balanced ac:structured-macro and ac:rich-text-body tags
- use panels for quick orientation
- use ui-tabs only when the same material needs multiple views
- use ui-expand for heavy detail, not for the main narrative
- preserve one logical home per concept

Output only the storage-format code.
```

## 4. First Refinement Prompt

Use right after the first page generation:

```text
Review the generated page and identify:
- which sections feel misplaced
- which sections are too detailed for default view
- which sections duplicate each other
- which section headings need clearer parent framing
- whether the page scope is narrower or broader than intended

Then propose a revision plan with:
1. structural moves
2. content merges
3. new tabs or expands
4. wording changes to align with actual scope
```

## 5. Follow-Up Customization Prompt

Use after the user reviews the first draft:

```text
The user has reviewed the first draft.

Ask targeted follow-up questions to refine:
- audience priority
- section ordering
- what should stay visible
- what should be collapsed
- where more rigor or more simplicity is needed
- whether the page should document process, decisions, reference data, or all three

Keep the questions concrete and tied to specific page sections.
```

## 6. QA Prompt

Use before delivery:

```text
Review this Confluence page as documentation, not just markup.

Check:
- logical flow
- section hierarchy
- duplication
- mismatch between stated scope and actual content
- whether tabs and expands are used intentionally
- whether the top of the page guides the reader correctly
- storage-format balance

Return:
1. findings
2. required fixes
3. optional improvements
```

## 7. Fast-Delivery Variant

Use when speed matters more than completeness:

```text
Create a strong first-pass Confluence page quickly.

Optimize for:
- clear top structure
- summary-first readability
- limited but useful use of panels and tabs
- easy later customization

Do not over-model the subject. Build a flexible draft that can be refined after review.
```
