---
name: redwood-creator
description: Portable Oracle Redwood creation skill. Use for Redwood-compliant UI/UX generation, critique, and implementation specs using only packaged local references and assets.
---

# Redwood Creator (Portable)

## Purpose
This skill provides a portable Redwood knowledge pack with local references, extracted visual taxonomy, selected PNG examples, and Oracle Sans fonts. The large source PDFs and ZIP asset bundles are intentionally omitted from this slim share package.

All guidance must be derived from files inside this skill package. Do not depend on external local folders.

## How To Use
1. Determine lane:
- App UI lane: Oracle JET/Redwood UI behavior and component compliance.
- Brand/marketing lane: Redwood brand color and marketing icon usage.
- Mixed lane: keep interactive UI in App UI lane; illustration/collateral in Brand lane.

2. Load local references (only from this package):
- `references/oracle-jet-ui.md`
- `references/redwood-brand-colors.md`
- `references/redwood-marketing-icons.md`
- `references/zip-contents-index.md`
- `references/visual-taxonomy.md`
- `references/livelabs-dashboard-layout.md` when creating LiveLabs-style analytics dashboards, app headers, filter disclosures, KPI cards, or governance panels.

3. Validate against extracted assets and manifests:
- `manifests/assets-inventory.csv`
- `manifests/source-coverage.md`

## Compliance Rules
- Use Oracle Sans assets from `assets/fonts/` when typography is needed.
- Use Redwood brand colors documented in `references/redwood-brand-colors.md`.
- Keep marketing icons out of app control chrome/navigation.
- Prefer Oracle JET-compliant patterns for app UI outputs.
- For ingestion/dedupe, emit strict labels:
  - `new unique source`
  - `duplicate (canonical: <name>)`
  - `needs manual review`

## Packaged Asset Scope
- `assets/fonts/`: OracleSans family files.
- `assets/images/`: selected PNG component and layout references.
- `references/zip-contents-index.md`: slim source-coverage summary for the ZIP bundles that were used during extraction but are not packaged.
- Guideline PDFs, component ZIPs, and icon ZIPs are not included in this slim package. Use the extracted references and manifests as the portable source of truth.

## Output Modes
- Ingestion mode: concise classification lines only.
- Critique mode: `What works` / `What to fix` / `Redwood-aligned replacement`.
- Build-spec mode: `Anatomy`, `States`, `Tokens`, `Accessibility`, `JET mapping`.

## Portability Guarantee
This skill is self-contained under one directory. If moved, keep relative structure intact:
- `SKILL.md`
- `references/`
- `assets/`
- `manifests/`
- `agents/`
