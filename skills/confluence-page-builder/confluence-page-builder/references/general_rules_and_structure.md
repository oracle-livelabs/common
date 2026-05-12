# General Rules And Structure

## Core Principles

- Start with the actual page purpose, not the raw source material.
- Optimize for the user's reading path before optimizing for completeness.
- Keep summary content visible and reference content collapsible.
- Use one logical home per concept.
- Build for fast first delivery and planned refinement.

## Default Page Pattern

### Top Of Page

- mission or purpose
- scope
- TOC
- one "at a glance" area with panels if the page is complex

### Middle Of Page

- overview
- operating model or framework
- decisions, lifecycle, or strategy sections
- inputs, evidence, or assumptions sections
- calculations, formulas, or criteria sections

### Bottom Of Page

- detailed references
- thresholds
- appendices
- validation details

## Governance-Style Pattern For Complex Pages

Use this when the page is a strategy page, governance page, overview-and-routing page, or any page that mixes summary guidance with dense reference detail.

### Recommended shape

- landing band with mission, scope, and TOC
- at-a-glance panel row
- one expandable reading guide
- overview section
- one tabbed framework section for the main views of the subject
- visible operating or decision sections
- expandable detail sections for dense rules, thresholds, or reference material

### Common failure mode to avoid

Do not stop at a clean but linear h2/h2/h2 page when the subject naturally has:

- multiple audiences
- multiple valid views of the same subject
- heavy reference detail that should sit below the fold
- a need for faster scanning than plain prose provides

## When To Use Each Confluence Pattern

### Panels

Use for:

- mission
- scope
- quick orientation
- key takeaways
- at-a-glance inputs, outputs, or decisions

Do not use for long prose or dense technical logic.

### Tabs

Use when the same subject needs multiple equally valid views, such as:

- output view vs decision view
- architecture vs flow
- formulas vs interpretation
- strategy vs execution
- resource selection vs user journey
- role view vs tool view

Do not use tabs as a hiding place for unrelated sections.

### Expandable Sections

Use for:

- dense rules
- long tables
- large reference lists
- detailed logic
- formulas and worked examples
- reading guides for complex pages
- refresh notes or archived context that should not interrupt the main path

Do not collapse the main narrative path.

### Tables

Use for:

- definitions
- comparisons
- criteria summaries
- thresholds
- decision summaries

Do not use tables when short prose is clearer.

## Section-Grouping Rules

- If two sections answer different questions, create a parent section.
- If two sections answer the same question differently, merge or separate using tabs.
- If a section exists only because data exists, it probably needs a better parent purpose.
- If a section repeats another section's logic, one of them is wrong or misplaced.
- If the page has both a visible story and a dense reference layer, separate them intentionally instead of mixing both into the same heading stack.

## First-Draft Then Refinement Model

The future skill should generate:

1. a strong first draft
2. a focused refinement loop

The refinement loop should check:

- is the scope right
- is the section order right
- what feels duplicated
- what should be visible by default
- what should move into tabs or expands
- what feels too technical or too shallow

## Questions The Skill Should Ask After Draft 1

- Which sections feel most useful versus most noisy?
- What should remain visible without any clicks?
- Which sections should become tabs?
- Which sections should become expandable?
- Is the page documenting strategy, process, reference, or a blend?
- Are any headings misleading or too narrow for the real scope?
- Which parts need stronger data, formulas, or decision logic?
