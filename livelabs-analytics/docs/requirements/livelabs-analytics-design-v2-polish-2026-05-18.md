# LiveLabs Analytics V2 Design Polish Requirements

Date: 2026-05-18

## Source Request

Improve the current LiveLabs Analytics dashboard while preserving the newer sidebar search, search-detail view, and table pagination features.

- Make the sidebar search clear button white so it remains visible on the dark search field.
- Replace the current `Portfolio Governance`, `Demand Signals`, and `Lifecycle Review` signal chips with hashtag-style informational signals: `# Demand`, `# Staleness`, `# Supersedment`, and `# Ownership`.
- Add concise hover and keyboard-focus tooltips for each hashtag, using dashboard definitions and Lanham-style wording.
- Present the hashtags as informational badges, not buttons, so users do not expect a click action.
- Rebalance the highlight cards so the card role is largest, the workshop title is medium, and the metadata line remains small.
- Ensure card role labels such as `Top Performer Workshop` are not red.
- Compare the current dashboard with the V2 export at `C:\Users\Lucian Brinzei\Desktop\livelabs-analytics-V2-export\livelabs-analytics-V2`.
- Apply V2 design cues where safe, especially square button styling and hover states.
- Do not copy outdated V2 behavior that would remove current search, search page, filters, or pagination.
- Test the result and start a local live server for review.

## Detailed Implementation Prompt

Update the static LiveLabs Analytics dashboard in `common/livelabs-analytics`.

Use the V2 export only as a visual reference. Keep the current `index.html` behavior intact, including the sidebar search, selected-result detail view, `Back to Dashboard`, collapsed table filters, sorting, row expansion, and pagination range controls.

Implement a design-only pass in `index.html`:

1. Style the sidebar `type="search"` cancel control so the clear icon renders white on the dark input.
2. Replace the metric-band signal chips with hashtag information badges for demand, staleness, supersedment, and ownership.
3. Add accessible tooltip text for each hashtag:
   - Demand: `12-month and 90-day views show what users still choose.`
   - Staleness: `Content older than 12 months needs review.`
   - Supersedment: `Replacement evidence shows when newer content can take over.`
   - Ownership: `Owner is available to maintain content.`
4. Adjust hero/highlight card typography to a clear large, medium, small hierarchy.
5. Remove red styling from card role labels.
6. Align button-like controls with the V2 square 8px-radius style and add consistent hover/focus states.

## Implementation Plan

1. Inspect the current and V2 `index.html` files for shared visual patterns and feature differences.
2. Write this requirements and implementation prompt artifact before changing the dashboard.
3. Patch only `index.html` for styling and small metric-band markup changes.
4. Avoid touching JSON payloads or table-generation data.
5. Validate HTML script syntax, JSON payload parsing, HTTP asset access, sidebar search, search-detail navigation, back-to-dashboard behavior, and pagination.
6. Capture desktop and mobile screenshots for visual review.
7. Start a local static server and report the URL, validation evidence, task log, and performance assessment.

## Acceptance Criteria

- Sidebar search clear icon is white after the user types.
- Metric-band signals read `# Demand`, `# Staleness`, `# Supersedment`, and `# Ownership`.
- Each hashtag exposes concise explanatory tooltip text on hover and keyboard focus without acting like a button.
- Highlight cards show role label as the largest text, workshop title as medium text, and metadata as small text.
- Highlight card role labels are not red.
- Button-like controls use a consistent square style and visible hover/focus feedback.
- Sidebar search, search-detail view, `Back to Dashboard`, sorting, filters, and pagination still work.
- Local HTTP and DOM smoke checks pass.
