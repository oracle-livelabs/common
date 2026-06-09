# General Rules And Structure

## Core Principles

- Start with the actual page purpose, not the raw source material.
- Optimize for the user's reading path before optimizing for completeness.
- Keep summary content visible and reference content collapsible.
- Use one logical home per concept.
- Build for fast first delivery and planned refinement.

## Default Page Pattern

### Top Of Page

- a three-column orientation band when the page has more than one audience or action path
- left column: mission or purpose in an `info` macro
- middle column: team and roles, owner, audience, or key links
- right column: contents
- one three-card "Quick Glance" row when readers need fast summary, status, or review cues

### Middle Of Page

- numbered `ui-steps` for the main process, lifecycle, or review path
- overview only when it adds context not already covered by mission and Quick Glance
- operating model or framework tabs
- compact checklist, decision aid, or status legend close to the flow when readers need it to act
- decisions, lifecycle, or strategy sections
- inputs, evidence, or assumptions sections
- calculations, formulas, or criteria sections

### Bottom Of Page

- detailed references
- thresholds
- one `Legend And FAQ` section when terms and questions both belong near the bottom
- grouped question tabs with expandable answers
- appendices
- validation details

## Governance-Style Pattern For Complex Pages

Use this when the page is a strategy page, governance page, overview-and-routing page, or any page that mixes summary guidance with dense reference detail.

### Recommended shape

- landing band with mission, role/link context, and TOC
- three-card Quick Glance panel row
- numbered steps for the main flow or decision path
- one expandable reading guide
- overview section
- one tabbed framework section for the main views of the subject
- visible operating or decision sections
- legend tabs when terms, statuses, or records need decoding
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

### Three-Column Sections

Use for:

- mission/team/contents orientation at the top of a page
- exactly three Quick Glance cards
- short side-by-side comparisons

Do not use for:

- large tables
- full procedures
- unrelated sections that only happen to fit in columns

### UI Steps

Use for:

- numbered process flows
- lifecycle states
- decision paths
- review or approval sequences

Keep each step short. Move exceptions, evidence, or detailed instructions into tabs or expands below the steps.

### Tabs

Use when the same subject needs multiple equally valid views, such as:

- output view vs decision view
- architecture vs flow
- formulas vs interpretation
- strategy vs execution
- resource selection vs user journey
- role view vs tool view

Do not use tabs as a hiding place for unrelated sections.

### Legend Tabs

Use when repeated labels would otherwise force explanations into the main flow:

- process terms and acronyms
- status labels and colors
- package, artifact, record, or system names
- owner actions tied to records or labels

Keep legend tabs compact. If a term is not used by the page, remove it.

### Expandable Sections

Use for:

- dense rules
- long tables
- large reference lists
- detailed logic
- formulas and worked examples
- reading guides for complex pages
- grouped FAQ answers
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
- If parent and child headings repeat the same label, rename the parent or child. Use `Legend And FAQ` with child headings `Legend` and `Questions`, not `FAQ` with `FAQ Questions`.
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
- whether the top band has the right mission, team, links, and contents balance
- whether the Quick Glance cards are the right three cards
- whether legends or FAQ groups make status-heavy content easier to scan
- whether any parent/child headings repeat the same label
- what feels too technical or too shallow

## Questions The Skill Should Ask After Draft 1

- Which sections feel most useful versus most noisy?
- What should remain visible without any clicks?
- Does the top band make the page easier to scan?
- Are the Quick Glance cards useful, or should one be replaced?
- Which sections should become tabs?
- Which sections should become expandable?
- Would a tabbed legend reduce repeated explanations or status confusion?
- Should FAQ questions be grouped by process, ownership, and status instead of one long list?
- Is the page documenting strategy, process, reference, or a blend?
- Are any headings misleading or too narrow for the real scope?
- Which parts need stronger data, formulas, or decision logic?
