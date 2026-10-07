# NoDoc search maintenance

Updated 7 October 2026 after the MCP documentation and draft-workflow revisions.

The NoDoc page search and the author guide's global search build their NoDoc records from `nodoc-workshop.html` through `assets/js/nodoc-search.js`. Titles, lab/task positions, descriptions, and keywords come from that fragment. There is no separate list of task titles or URLs to update.

## Editing a searchable section

- Keep the lab or task title in its existing `summary` element.
- Add or revise `data-search-summary` on the lab/task `details` element. Describe the actual workflow in one short sentence and identify UI or MCP when relevant.
- Use `data-search-keywords` for supported tool names and useful alternate terms, such as installation, setup, prepublish, and manual review. Do not add features the section does not document.
- Refresh the page after changing the fragment. Both indexes rebuild from the current source on page load. Changes made after a page has loaded require a refresh.
- Preserve task order when existing deep links must remain stable. If reordering is necessary, check every cross-link and search destination.

The parser excludes video placeholders, hidden content, copy/expand controls, and hidden tasks. Lab overview records exclude their task bodies; tasks receive their own records. Sections without custom metadata use a shortened introduction or body excerpt. `data-nodoc-search-exclude` can exclude non-documentation material from body matching.

## Local search behavior

Title and curated-keyword matches outrank incidental body mentions and cross-references. Common singular/plural forms and approve/approval match consistently. Lab and task numbers constrain the destination, including compact queries such as `Lab8 Task8`. Every query term must match. The page displays up to ten results and reports the total when more are available. Escape clears search and restores the reader.

Global search uses the same NoDoc records and descriptions with its existing broader author-guide ranking. It can also show partial matches from other guide sections.

## Validation for this refresh

- 79 automated tests passed: 13 search behavior checks and the existing 66-test suite.
- All 14 NoDoc content validation checks passed.
- 27 browser checks passed, covering 19 topic queries, exact result navigation, lab/task numbering, result totals, empty/short queries, Escape, shared search, and a confirmed 390 × 844 mobile viewport.
- No browser errors were recorded in the local or shared search checks. Desktop and mobile screenshots were visually reviewed.

Representative first results:

| Query | Destination |
| --- | --- |
| manual draft review | Lab 3, Task 2: manual UI draft workflow |
| Codex drafts / discard_page_draft | Lab 8, Task 8: Codex MCP draft workflow |
| MCP installation / usage skill | Lab 1, Task 3: connection setup |
| run_livelabs_qa | Lab 8, Task 6: MCP preview and QA |
| MCP architecture | Lab 8 overview |
| manual prepublish | Lab 9, Task 1: manual target setup |
| restore deleted pages | Lab 2, Task 4: history and recovery |
| WMS publishing request | Lab 10, Task 3: publishing handoff |

Evidence is local under `output/nodoc-mcp-review-2026-10-07/search-*` and `output/screenshots/nodoc-search-refresh/`. These checks verify documentation search and navigation, not authenticated NoDoc actions.
