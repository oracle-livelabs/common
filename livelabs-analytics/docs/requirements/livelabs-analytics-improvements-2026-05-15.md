# LiveLabs Analytics Improvements Requirements

Date: 2026-05-15

## Source Request

Improve the LiveLabs Analytics dashboard with:

- footer text: `Powered by Oracle LiveLabs Team © 2026`
- revised hero signal wording currently shown as `Governance`, `Demand`, `Retirement`
- a left-menu search component that behaves like a componentized app flow
- a workshop detail view driven by search selection
- a `Back to Dashboard` button that restores the main dashboard
- seamless transitions between dashboard and search-detail states
- table pagination with range categories: `15 - 20`, `20 - 40`, `40 - 60`, `60 - 80`, `80 - 100`, `100 - 120`, `120 - 140`
- month values displayed as floored integers instead of decimals

## Requirements

1. The footer must appear at the bottom of the dashboard and use the requested LiveLabs ownership text.
2. The hero signal band must use clearer governance wording than the current three-word sequence.
3. The sidebar must include a search field above the menu links.
4. Search must update results while the user types.
5. Selecting a search result must render a focused workshop detail view in the main page area.
6. The detail view must expose useful workshop fields, including title, IDs, category, owner or author, update evidence, status, and source context when available.
7. The detail flow must include a visible `Back to Dashboard` button in the sidebar.
8. Clicking `Back to Dashboard` or any normal dashboard menu link must restore the main dashboard view.
9. Table pagination must continue to work with sorting and filtering.
10. Pagination controls must include the requested row-range categories for fast review of ranked table windows.
11. Category filters must remain exact-match controls so broad categories do not accidentally match longer category names.
12. Month values in rendered HTML and JSON payloads must be floored to integer values.

## Detailed Implementation Prompt

Update the existing static LiveLabs Analytics GitHub Pages dashboard in `common/livelabs-analytics`.

Preserve the single-file static architecture of `index.html` and the checked-in JSON assets. Add a left-rail search component near the top of the menu that indexes existing table rows and row detail metadata at runtime. The component should provide live search results, render the selected workshop or sprint as a detail view in the main content area, and allow users to return to the dashboard with a `Back to Dashboard` control. Keep the transition smooth with CSS state classes instead of a page reload.

Extend the existing table controls so pagination coexists with filters, sorting, row expansion, exact category filters, and range jump categories. Include ranges `15 - 20`, `20 - 40`, `40 - 60`, `60 - 80`, `80 - 100`, `100 - 120`, and `120 - 140`.

Update all visible and payload month values from decimal values to floored integer month values. Validate that the HTML is still parseable, the script has valid syntax, the static page serves over HTTP, and representative assets return HTTP 200.

## Proposed Improvements

- Use the existing DOM as the search index source so the feature stays static and GitHub Pages-safe.
- Deduplicate search results by `WMS ID` and `LiveLabs ID` when possible.
- Prefer component-like render functions over hand-maintained duplicate markup.
- Add exact category dropdowns to reduce accidental overmatching in tables.
- Keep `Back to Dashboard` in the sidebar so the search flow feels like a view switch, not a modal.
- Add range jumps as an optional pagination layer without removing normal next/previous paging.

## Acceptance Criteria

- The page footer shows `Powered by Oracle LiveLabs Team © 2026`.
- The metric band no longer reads only `Governance`, `Demand`, `Retirement`.
- Searching from the sidebar shows live matching content.
- Selecting a result switches the main content to a search detail view.
- The back button restores the dashboard without reloading the page.
- Table pagination works after applying filters and after sorting.
- Range pagination includes all requested range categories.
- No rendered month displays contain decimal month values.
- JSON month fields are integers where the field represents month age or elapsed months.
- Static validation passes for script syntax and core local asset availability.
