# Oracle JET App UI Taxonomy

This slim bundled pack is for Oracle JET application UI, not screenshot-driven component recreation.

## Keep

- App shell and masthead structure.
- Sidebar or tab navigation using JET glyph/icon classes.
- Buttons and command controls with JET glyphs where available.
- Forms, inputs, lists, cards, data grids, and status indicators mapped to Oracle JET component patterns.
- Oracle Internals or Database X-Ray evidence panels using JET/Redwood surfaces.
- Dataset administration overlays and validation states using JET/Redwood controls.
- Oracle JET typography/font variables backed by Oracle Sans.
- Redwood theme colors and documented token-style CSS variables.

## Avoid

- Tailwind or utility-first styling systems.
- Marketing pictograms in product UI chrome.
- Screenshot-derived component recreation.
- Large-radius cards, pill-heavy geometry, decorative flares, glow blooms, and abstract atmosphere layers.
- Manual SVG control icons where JET glyphs are available.

## Verification Cues

- Frontend imports `@oracle/oraclejet` and the Redwood theme.
- CSS uses JET/Redwood variables and Oracle Sans fallback.
- Buttons, sidebar navigation, titles, status, dataset actions, and Oracle Internals include `oj-ux-ico-*` glyphs.
- No Tailwind config, dependency, directive, or utility-first replacement system is present.
