---
name: confluence-page-builder
description: Draft, restructure, validate, and iteratively refine Confluence storage-format pages. Use for new Confluence pages, versioned page workspaces, summary-first templates, storage markup, tabs, status legends, expand sections, duplicate-content QA gates, task reports, and targeted refinement questions.
---

# Confluence Page Builder

## Overview

Use this skill to produce strong Confluence storage-format pages quickly, then improve them through a versioned refinement loop. The default approach is summary-first and visual: start with a compact mission/team/contents top band, use a three-card Quick Glance row for orientation, use numbered steps for the main flow, use tables for source-of-truth data, use tabs for alternate views and legends, and move dense detail into expandable sections.

## Use This Skill When

- the user wants a new Confluence page or storage-format draft
- the user wants a working directory with page versions, logs, lessons, and reports
- the user has notes, requirements, or documentation that should become a Confluence page
- an existing Confluence page needs a structural overhaul
- the user wants clearer section hierarchy, less duplication, or better use of panels, tabs, and expands
- the user wants a fast first draft, then targeted questions and proposed improvements after each version

## Workflow

1. Define the real page purpose.
   Identify audience, scope, source material, the main questions the page should answer, and the decision or action the page should support.

2. Create a workspace for page-generation tasks unless the user asks for chat-only output.
   Run:

   ```powershell
   python "<skill-root>\scripts\start_confluence_page_project.py" --title "<page title>" --prompt "<user prompt>"
   ```

   Use the printed `project_root`, `current_version_dir`, and `usage_guide` paths. If the user gives a target folder, pass it with `--root`.

3. Choose the page architecture.
   Read `references/summary_first_template.md` when selecting the layout. Pick one primary page family:
   - operational/process
   - strategy/framework
   - governance/decision
   - lightweight reference
   For most non-trivial pages, prefer the visual starter pattern: Mission + Team/Roles/Links + Contents in a three-column band, then three Quick Glance cards, then the main numbered flow, then tabs, legends, and expands.

4. Generate the first useful version.
   Write storage-format page code into `versions/v1/`. Use `assets/templates/summary-first-page-template.xml` as the preferred starting skeleton for project, process, governance, and mixed-audience pages; trim sections that do not fit the request instead of leaving placeholders.

5. Validate the structure.
   Use:
   - `scripts/confluence_outline_extract.py` to inspect headings, tabs, and expand sections
   - `scripts/confluence_storage_audit.py` to verify macro and rich-text-body balance
   - `scripts/confluence_page_qa_gate.py` to fail duplicate section labels, redundant FAQ patterns, unresolved placeholders, duplicate macro IDs, unescaped ampersands, and broken storage balance

6. Report after every version.
   In the version folder, write:
   - `TASK_REPORT.md`: changes made, design decisions, output path, proposed next improvements, and questions for the user
   - `VALIDATION_REPORT.md`: storage audit, outline, tabs, expands, and any unresolved issues
   Append reusable observations to `lessons-learned/LESSONS.md`.

7. Run a refinement pass.
   After each version, give the user the current output path, a concise task report, 3 to 5 targeted questions, and a short improvement proposal. Continue only when the user accepts, asks for another version, or provides feedback.

## Non-Negotiable Rules

- Start with the actual page purpose, not the raw source material.
- Keep one logical home per concept.
- Do not duplicate the same decision logic across multiple sections.
- Do not duplicate labels across parent and child sections. For example, use `Legend And FAQ` with child headings `Legend` and `Questions`; do not use `FAQ` plus `FAQ Questions`.
- Do not collapse the main narrative path.
- Prefer the visual starter for cleaner first drafts: top band, three Quick Glance cards, numbered steps, tabs, and expands.
- Put useful checklists, decision aids, or source-of-truth tables where the reader needs them, not automatically at the end.
- Add a compact legend before FAQ when the page uses statuses, acronyms, process terms, package names, records, or other labels a reader may misread.
- For complex strategy, governance, or routing pages, do not default to a long linear heading stack when a landing band, framework tabs, and detail expands would make the page easier to scan.
- Use tables for definitions, comparisons, criteria, and summaries.
- Use tabs only when the same content needs multiple valid views.
- Use expandable sections for heavy detail, formulas, large tables, and reference material.
- Do not add decorative sections, hero clutter, or extra explanatory blocks that do not help the reader decide, act, or understand.
- Validate Confluence storage-format structure before final delivery.
- Run the QA gate before final delivery. Fix all `FAIL` findings before handing a page to the user.
- Provide a version path and task report after every iteration.

## PM And Agent Mode

Assess complexity before starting. Stay solo for short, single-audience pages or simple edits.

Use PM mode only when the user explicitly asks for agents, delegation, or parallel review and the environment supports it. Useful roles:

- UI/UX Designer: hierarchy, layout, tabs, expands, and scannability
- Content Writer: headings, summaries, and concise explanations
- Quality Analyst: storage validation, links, tables, and consistency
- Devil's Advocate: duplication, overbuilding, assumptions, and missing reader actions

If agents are not available or not explicitly authorized, perform these role-based checks locally and say no subagents were spawned.

## Read These References When Needed

- For the selected page template, page family rules, UX rules, and iteration questions:
  - `references/summary_first_template.md`
- For workspace creation, version folders, reports, logs, lessons, and PM mode:
  - `references/iteration_workspace_workflow.md`
- For generalized layout rules, visibility rules, and section-grouping heuristics:
  - `references/general_rules_and_structure.md`
- For reusable prompt patterns for intake, architecture, generation, refinement, and QA:
  - `references/prompt_ideas.md`
- For a complex real-world example of summary-first Confluence storage format:
  - `references/example_governance_page_storage_format.xml`
    - treat this as the preferred pattern for dense strategy or overview pages that need stronger UI structure, not just as a content example

## Scripts

- `scripts/start_confluence_page_project.py --title "<title>" --prompt "<prompt>"`
  - Create a Desktop workspace with `versions/`, `logs/`, `lessons-learned/`, `reports/`, `resources/`, and root `USER_GUIDE.md`
- `scripts/confluence_outline_extract.py <path>`
  - Extract headings, standard/UI tabs, and standard/UI expand-section titles from storage-format markup
- `scripts/confluence_storage_audit.py <path>`
  - Check macro/body balance before delivery
- `scripts/confluence_page_qa_gate.py <path>`
  - Run the delivery gate for storage balance, duplicate headings, redundant FAQ wording, duplicate macro IDs, placeholders, and unescaped ampersands

## Output Contract

For each version, return:

- the current storage-format file path
- the version folder path
- validation status
- what changed
- proposed improvements
- targeted questions for the user
- whether to accept, iterate, or stop
