# LiveLabs Dashboard Layout Patterns

Use this reference when producing Redwood-aligned LiveLabs analytics dashboards or similar Oracle operational dashboards. Keep factual copy and metrics sourced from the project materials; use this file only for layout behavior and visual treatment.

## Header And Brand Area
- Use a real Redwood/Oracle approved bitmap illustration or abstract banner when available; copy it into the project assets so local `file://` pages remain self-contained.
- For dark banners, use white logo artwork and white header copy. Add a restrained dark overlay only when needed for text contrast.
- Keep the brand/logo first, then the page title, then a concise operational summary derived from project materials.
- Avoid floating metadata chips over illustrative headers unless explicitly requested; put operational metrics in the card grid instead.
- A thin approved color strip can separate the hero from the dashboard body. Keep it visually light, usually around 12-16px high.

## KPI Cards
- Use a consistent repeated card layout: small Title Case label, strong numeric value, short evidence note, and one bottom accent bar.
- Do not add decorative dots or extra glyphs inside KPI cards unless they carry state.
- For neutral KPI sets, use one shared accent color such as Oracle teal `#4F7D7B`; reserve red for risk/action cards.
- Prefer flat cards with borders and no drop shadows when matching Oracle Architecture Center style references.

## Filters And Tables
- For table filters, use an `Apply filters` disclosure: filter glyph, label, chevron, then the input controls inside the expanded body.
- Keep the existing filter behavior close to the table it controls; do not move filters into unrelated global chrome unless the page has cross-table filtering.
- Table metadata should not render below 12px; override browser-default `small` sizing when needed.

## Governance Panels
- For Action Queues or similar summary groups, use Title Case labels. Avoid all-caps labels for readable operational cards.
- Move category/risk color details to the bottom bar of the cards instead of top strokes when matching the Architecture Center card model.
- Keep risk/action bottom bars red when the cards represent retirement, candidate, or validation queues.

## Content Discipline
- Do not invent dashboard copy. Use local README, legend files, JSON extracts, or project-provided training materials for facts, labels, counts, and descriptions.
- Keep marketing pictograms out of app navigation and controls. Use simple app UI glyphs for navigation and filter actions.
