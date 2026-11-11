# Summary-First Confluence Template

Use this reference when designing a new Confluence storage-format page or restructuring an existing page.

## Page Type Selection

Choose one primary page family before writing markup.

| Page family | Use when | Default structure |
| --- | --- | --- |
| Operational/process | The page explains how work moves through steps, owners, packages, systems, or status gates. | Three-column top band with Mission, Team/Roles, Key Links, and Contents; three-card Quick Glance row; numbered `ui-steps`; early checklist or contract tabs; source-of-truth table; `Legend And FAQ` with legend tabs and grouped question expands |
| Strategy/framework | The page explains strategy, quality model, roadmap, governance approach, or operating principles. | Three-column top band with Mission, Scope/Team, and Contents; three-card Quick Glance row; overview; framework tabs; principles or operating cycle; detailed reference expands |
| Governance/decision | The page records lifecycle states, criteria, scoring, thresholds, decision rules, or runbooks. | Three-column top band with Mission, ownership, and Contents; three-card Quick Glance row; decision path; framework tabs; lifecycle/state table; scoring or evidence expands; legend tabs; action/runbook sections |
| Lightweight reference | The page is mostly definitions, links, or a short standard operating note. | Short Mission or Purpose, compact links, one source table, and FAQ or Appendix expands |

## Preferred Visual Starter

For most new first drafts, start closer to the visual initiative template:

1. Use a three-column top band:
   - left: `info` macro with Mission and outcome
   - middle: compact Team & Roles plus Key Links
   - right: Contents macro
2. Add a `Quick Glance` row with exactly three cards/panels. Each card should answer one fast reader question, such as purpose, current state, and review need.
3. Use a numbered `ui-steps` block for the main flow, lifecycle, process, or operating path.
4. Use `ui-tabs` when the same topic benefits from role, system, package, status, or lifecycle views.
5. Add a compact `Legend And FAQ` section when the page contains statuses, acronyms, process terms, package names, or records that readers need to decode.
6. Put dense supporting detail, raw reference, long FAQs, and edge cases into `expand` or `ui-expand` sections.

Do not turn the top of the page into separate full-width sections unless the user provides a very narrow or short reference page. The default should feel like a concise visual dashboard, not a linear document dump.

## Legend And FAQ Pattern

Use this pattern when a page has status labels, acronyms, package names, roles, records, process labels, or other repeated terms.

1. Use one parent heading: `Legend And FAQ`.
2. Use child headings `Legend` and `Questions`. Do not create `FAQ` plus `FAQ Questions`; that duplicates the label.
3. Place the section near the bottom unless the legend is essential to complete the main flow.
4. Use one `ui-tabs` group for the legend:
   - Process Terms
   - Status Labels
   - Records & Artifacts
5. Use status macros inside the Status Labels tab when labels have real state meaning. A common baseline is Green for current or published, Yellow for pending, Grey for review, Blue for active QA or validation, and Red for blockers or flags.
6. Group questions in a second `ui-tabs` macro. Put each answer inside an `expand` macro with a clear category prefix in the title.
7. Keep each answer in a `Short answer:` paragraph plus one detail paragraph. Move long evidence into the details or appendix section.
8. Do not add an intro paragraph that restates how the tabs work unless the page has an unusual reader path.

Use Redwood-inspired color sparingly: Oracle Red `#C74634` for critical accents, Oracle Bark `#312D2A` for section labels, Finance Teal `#4F7D7B` or Brand Green `#5F7D4F` for calm positive accents, and Link Blue `#00688C` for navigation or QA accents.

## Default UX Pattern

1. Start with a short visible mission or purpose.
2. Keep team, owner, audience, links, and contents near the mission when they help the reader orient.
3. Add a three-card Quick Glance row when the page has multiple stakeholders, statuses, or decisions.
4. Put the main workflow, decision path, or summary table before dense reference detail.
5. Put checklists near the flow they support, not at the very end.
6. Use one tab group for alternate views of the same subject.
7. Use expandable sections for detail that supports but does not carry the main narrative.
8. Use legend tabs before FAQ when readers need to decode repeated labels.
9. End with FAQ or reference only when it answers real reader questions.

## Component Rules

| Component | Good use | Avoid |
| --- | --- | --- |
| Panel | Mission, warning, status, or short summary | Long prose or every section |
| Three-column section | Mission/team/contents top band, or three-card Quick Glance row | Deep content, large tables, or unrelated blocks |
| UI steps | Numbered process, lifecycle, flow, or review path | Dense reference data or unordered bullets |
| Table | Source-of-truth records, decisions, criteria, roles, statuses | Paragraphs forced into grids |
| Tabs | Alternate views of the same concept | Unrelated sections hidden together |
| Legend tabs | Process terms, status labels, and records that explain repeated page language | A glossary of terms that appear once |
| Expand | Evidence, logs, raw notes, formulas, FAQ answers | Main reading path |
| Status macro | Current/pending/blocker states | Decorative labels without action meaning |
| TOC | Long pages with clean headings | Short pages or noisy heading stacks |

## Iteration Questions

Ask 3 to 5 questions after each version. Make them specific to the page just generated.

- Which section should stay visible even for a busy reviewer?
- Do the mission, team, key links, and contents belong in the top band, or should one move lower?
- Are the three Quick Glance cards the right three reader questions?
- Which section feels too detailed or should move into an expand?
- Which table is the source of truth, and are any columns missing?
- Are the tabs truly alternate views of the same topic?
- Do the legend tabs explain every status, acronym, or package label the reader must understand?
- Are FAQ questions grouped by reader task instead of dumped into one long list?
- Which user action should the page make easier?
- What should be removed because it does not help the reader decide or act?

## Completion Standard

A good page has:

- one clear purpose
- no duplicate logic
- no duplicate parent/child labels such as `FAQ` and `FAQ Questions`
- a visible reader path
- dense detail moved behind tabs or expands
- validated storage-format balance
- a passing `confluence_page_qa_gate.py` result
- a task report with output path, validation, open questions, and proposed next iteration
