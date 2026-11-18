# Redwood design notes

Updated 5 October 2026.

## Applied references

- Packaged Redwood Creator UI, color and LiveLabs dashboard layout guidance.
- `livelabs-analytics/assets/css/dashboard.css`: Oracle Sans, Bark rail, warm paper, flat table surfaces.
- `new-author-guide/assets/css/author-guide.css` and improvements: clear wayfinding, consistent spacing and readable controls.
- QA Automation unified/PAR reporters: compact status-led tables, filters, per-run navigation and expandable evidence.

## Current design

Use a 220px desktop rail, one page title/description, a flat metric strip and one primary collection at a time. The warm surface is `#FBF9F7`, body text `#161513`, Bark `#312D2A`, Oracle Red `#C74634`, and light-surface links `#00688C`. Sidebar companion links use `#F0CC71`. Oracle Sans is bundled locally. Color supplements text; it does not carry status alone.

The shared table component provides labeled search, relevant filters, clear-filter actions, numeric/text sorting with `aria-sort`, 12-row pages, counts and empty states. Sorting and pagination preserve focus; page navigation moves focus to the main content; the native report dialog traps focus and supports Escape. Tables scroll within labeled regions. Mobile navigation is an explicit Menu disclosure.

The information order is Overview, On-Call, Jenkins Reports, PAR Links, QA Automation, Repositories; Settings is separated at the bottom. This exposes frequent work directly and removes the intermediate QA Operations launcher. Related domain checks are reviewed through results and coverage rather than separate placeholder pages.

Avoid large hero art, repeated introductions, nested cards, decorative KPI icons and long technical copy above data. Draft evidence, source readiness and run metadata live behind disclosures. Unknown or unavailable data uses a dash and a concise reason.

## Scope of compliance

This implementation uses native HTML controls with Redwood-aligned styling. It is not Oracle JET/Core Pack and is not certified as a JET implementation. A future JET migration should map navigation, tables, filters and dialogs to supported components while preserving the contracts and behavior.
