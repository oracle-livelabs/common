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

## Cheatsheet quick answers

`assets/js/nodoc-cheatsheet-data.js` supplies 53 concise NoDoc modules and 11 topic sub-tags to the shared cheatsheet collection. The NoDoc parent tag opens the sub-tags; choosing a sub-tag narrows the cards while retaining the NoDoc context. Tag URLs and individual module URLs support refresh and browser history. The guide's global search also indexes these modules and their keywords.

These cards are curated summaries of this guide, so update the matching cards when a documented workflow changes. Keep each card's `source: [lab, task]` reference aligned with the source task order (`[0]` links to the introduction). The shared renderer resolves those references for the current guide location. Preserve the distinctions between browser and MCP draft review, saved history and pending drafts, article and page recovery, and Pre Publish and the WMS publishing handoff.

The October 7 cheatsheet browser check confirmed coverage of all 35 current source tasks, all 53 module detail views and source links, all 11 sub-tag filters, search, sorting, refresh, browser history, and mobile layouts. The local check and results are under `output/nodoc-cheatsheet/`; captures are under `output/screenshots/nodoc-cheatsheet/`. This verifies the guide UI and content links, not authenticated NoDoc actions.

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
