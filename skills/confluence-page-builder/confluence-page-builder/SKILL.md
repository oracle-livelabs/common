---
name: confluence-page-builder
description: Draft, restructure, and refine Confluence storage-format pages on any subject. Use for first-draft Confluence pages, converting notes into Confluence markup, overhauling existing page structure, and improving section hierarchy, tabs, expand sections, and readability.
---

# Confluence Page Builder

## Overview

Use this skill to produce strong Confluence pages quickly, then improve them through a focused refinement pass. The default approach is summary-first: keep the main reading path visible and move dense detail into tabs or expandable sections.

## Use This Skill When

- the user wants a new Confluence page or storage-format draft
- the user has notes, requirements, or documentation that should become a Confluence page
- an existing Confluence page needs a structural overhaul
- the user wants clearer section hierarchy, less duplication, or better use of panels, tabs, and expands
- the user wants a fast first draft that can be customized after review

## Workflow

1. Define the real page purpose.
   Identify audience, scope, the main questions the page should answer, and the decisions or actions it should support.

2. Choose the page architecture.
   Default to:
   - a strong top section for purpose, scope, and orientation
   - a landing band for complex pages with mission, scope, and TOC
   - an "at a glance" panel row when the page has multiple audiences, outputs, or decision uses
   - a visible summary path through the page
   - a "how to use this page" expandable reading guide for dense strategy or reference pages
   - one tabbed framework section when the same subject needs multiple valid views
   - parent sections when multiple subsections answer different questions
   - tabs for alternate views of the same subject
   - expandable sections for dense reference material

3. Generate the first draft quickly.
   Unless the structure is highly ambiguous, produce a usable first draft instead of stopping at analysis.

4. Validate the structure.
   Use:
   - `scripts/confluence_outline_extract.py` to inspect headings, tabs, and expand sections
   - `scripts/confluence_storage_audit.py` to verify macro and rich-text-body balance

5. Run a refinement pass.
   After the first draft, ask targeted follow-up questions about:
   - section order
   - what should stay visible
   - what should be collapsed
   - where more rigor or simpler wording is needed
   - which sections feel duplicated or misplaced

## Non-Negotiable Rules

- Start with the actual page purpose, not the raw source material.
- Keep one logical home per concept.
- Do not duplicate the same decision logic across multiple sections.
- Do not collapse the main narrative path.
- For complex strategy, governance, or routing pages, do not default to a long linear stack of headings when a landing band, panel row, framework tabs, and detail expands would make the page easier to scan.
- Use tables for definitions, comparisons, criteria, and summaries.
- Use tabs only when the same content needs multiple valid views.
- Use expandable sections for heavy detail, formulas, large tables, and reference material.
- Validate Confluence storage-format structure before final delivery.

## Read These References When Needed

- For generalized layout rules, visibility rules, and section-grouping heuristics:
  - `references/general_rules_and_structure.md`
- For reusable prompt patterns for intake, architecture, generation, refinement, and QA:
  - `references/prompt_ideas.md`
- For a complex real-world example of summary-first Confluence storage format:
  - `references/example_governance_page_storage_format.xml`
    - treat this as the preferred pattern for dense strategy or overview pages that need stronger UI structure, not just as a content example

## Scripts

- `scripts/confluence_outline_extract.py <path>`
  - Extract headings, tabs, and expand-section titles from storage-format markup
- `scripts/confluence_storage_audit.py <path>`
  - Check macro/body balance before delivery
