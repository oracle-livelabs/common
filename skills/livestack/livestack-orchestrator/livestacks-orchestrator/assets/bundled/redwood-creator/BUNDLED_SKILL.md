---
name: redwood-creator
description: Portable Oracle JET / Redwood app UI skill. Use for Oracle JET framework, Redwood theme, Oracle Sans typography, and JET glyph guidance using only packaged local references and assets.
---

# Redwood Creator (Portable App UI Pack)

## Purpose
This skill provides a lightweight portable Oracle JET / Redwood app UI pack with local references, Oracle Sans fonts, Redwood color guidance, and JET glyph/icon rules.

All guidance must be derived from files inside this skill package. Do not depend on external Downloads paths.

## How To Use
1. Stay in the App UI lane:
- Oracle JET framework behavior and component compliance.
- Oracle JET Redwood theme usage.
- Oracle JET typography/font variables backed by Oracle Sans.
- Oracle JET glyph/icon classes for controls, sidebar navigation, buttons, titles, status, dataset actions, and Oracle Internals.

2. Load local references (only from this package):
- `references/oracle-jet-ui.md`
- `references/redwood-brand-colors.md`
- `references/redwood-marketing-icons.md`
- `references/visual-taxonomy.md`

3. Validate against extracted assets and manifests:
- `manifests/assets-inventory.csv`
- `manifests/source-coverage.md`

## Compliance Rules
- Use Oracle JET typography/font variables first, backed by the full Oracle Sans asset set in `assets/fonts/`.
- Use Redwood brand colors documented in `references/redwood-brand-colors.md`.
- Keep marketing icons out of app control chrome/navigation.
- Prefer Oracle JET-compliant patterns for app UI outputs.
- Use JET glyph/icon classes for application chrome; do not hand-roll SVG control icons when a JET glyph exists.
- Do not use Tailwind. Tailwind config files, `tailwindcss` dependencies, `@tailwind` directives, and utility-first class systems are outside this Oracle JET app UI contract.
- Default Redwood app UI geometry to clear rectangles with minimal corner radii. If the user does not explicitly ask for rounded geometry, always keep panels, cards, badges, chips, buttons, and other surfaces on a tight rectangular radius budget instead of rounded-card or pill geometry.
- Redwood app UI work should keep backgrounds restrained and structural. Do not introduce decorative atmospheric effects such as sun flares, lens flares, glow blooms, abstract blobs, or gratuitous radial-gradient accents unless the user explicitly asks for them.
- For dark custom regions in app UI work, use Oracle JET contrasting-background semantics (`oj-color-invert` / `oj-contrast-marker`) or an equivalent theme-token approach rather than ad hoc dark/light color pairing.
- When custom colors override the default JET theme, verify rendered contrast on the actual background. Treat 4.5:1 as the baseline target for normal text and control labels unless a stronger requirement applies.
- Do not assume JET secondary inverted text (`oj-core-text-color-secondary`) is automatically safe on every custom brand-color dark surface. If the region is not a stock JET shell color, verify it numerically and promote to stronger foreground treatment when needed.
- When Oracle JET framework icons are placed inside controls, ensure the icon foreground follows the control foreground. Do not assume framework icon classes will inherit button text color correctly without verification.
- In dark custom regions, verify the brand mark itself remains readable. If the supplied logo asset is dark-on-transparent, switch to a light-on-dark variant or apply an equivalent readable treatment instead of leaving the mark visually lost.
- In custom app mastheads, use semantic image markup with a real `src` for logos; do not rely on CSS `content` on an `<img>` or other fragile logo hacks.
- Treat Oracle JET shell classes as opinionated app-shell primitives, not generic typography helpers. Do not reuse shell classes such as `oj-web-applayout-header-title` inside custom branded mastheads unless you have verified their computed metrics are safe for that composition.
- For custom Redwood/JET headers, verify constrained-width behavior explicitly: logo and text blocks should not overlap, title line-height must remain nonzero, and kicker/title/tagline stacks must remain readable.
- For ingestion/dedupe, emit strict labels:
  - `new unique source`
  - `duplicate (canonical: <name>)`
  - `needs manual review`

## Packaged Asset Scope
- `assets/fonts/`: full OracleSans family files.
- `references/`: lightweight Oracle JET, Redwood color, icon-boundary, and app UI taxonomy notes.
- `manifests/`: inventory and coverage for the slim app UI pack.

Heavyweight guideline PDFs, component ZIP archives, and direct PNG reference images are intentionally not bundled in this app UI pack. Generated LiveStacks should use Oracle JET framework components and Redwood theme styling, not screenshot-derived component recreations.

## Output Modes
- Ingestion mode: concise classification lines only.
- Critique mode: `What works` / `What to fix` / `Redwood-aligned replacement`.
- Build-spec mode: `Anatomy`, `States`, `Tokens`, `Typography`, `Accessibility`, `JET mapping`.

## Portability Guarantee
This skill is self-contained under one directory. If moved, keep relative structure intact:
- `SKILL.md`
- `references/`
- `assets/`
- `manifests/`
