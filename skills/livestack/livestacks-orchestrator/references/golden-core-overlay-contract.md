# Golden Core And Overlay Contract

Use this reference when materializing a new LiveStack or reviewing whether a generated bundle followed the current golden-template direction.

## Source Model

`/Users/mkowalik/projects/codey/workspace/livestack-template` is a template family, not four unrelated golden templates.

- `highered`, `lifesciences`, `media`, and `sled` share one runtime and application scaffold.
- The industry-specific work lives mostly in navigation labels, scene names, seeded vocabulary, semantic views, prompts, guide language, and dataset-template wording.
- Treat those folders as an overlay corpus. Do not copy one industry folder raw and call it the golden template.
- The top-level `guide/` is a guide cadence reference only. It is not the direct guide for those four industry apps.

## Golden Core

Every default LiveStack should start from one neutral core:

- four Podman services: `db`, `ords`, `ollama`, `app`
- fixed ports: `1521:1521`, `8181:8080`, `11434:11434`, `8505:3001`
- `./ords-config:/etc/ords/config:Z,U`
- explicit hostnames and `networks.default.aliases`
- one Node.js / Express app container serving a built Oracle JET / Redwood frontend
- app health at `/healthz`
- ORDS-first app APIs by default
- automated database and ORDS bootstrap under normal `podman compose up -d --build`
- Oracle Internals or Database X-Ray evidence backed by real routes, packages, SQL, or runtime traces
- one canonical dataset-admin entry in the top-right app chrome, defaulting to `Upload Your Own Data`
- Oracle JET Redwood theme, Oracle Sans, JET typography variables, and Oracle JET framework glyph classes
- no Tailwind, no utility-first replacement class system, and no non-JET icon library for app chrome

## Invariant Core Files

The template family in `/Users/mkowalik/projects/codey/workspace/livestack-template` keeps `.env.example` stable across industries and only varies `compose.yml` by the generated app image name. The new golden baseline is stricter:

- `stack/compose.yml` must match `assets/templates/golden-livestack-baseline/compose.yml`.
- `stack/.env.example` must match `assets/templates/golden-livestack-baseline/.env.example`.
- Do not put industry names, customer names, app image names, schema names, ORDS module names, or story labels in either file.
- Keep industry and pain-point variation in app code, database artifacts, seed/config data, docs, guide content, and `input/template-provenance.json`.
- If a future solution truly needs an extra service, record it as an explicit architecture exception before changing the core runtime contract.

## Overlay Layers

Apply overlays in this order:

1. **Industry Vocabulary**: user-facing labels, roles, nouns, seeded examples, domain glossary.
2. **Pain-Point Workflow**: primary user loop, queue, decision, exception path, and measurable outcome.
3. **Story Scenes**: navigation sequence, scene titles, primary CTAs, expected screen changes.
4. **Oracle Capability Map**: chosen Oracle features and the exact scene evidence that proves them.
5. **Data Contract**: source records, importable CSV/JSON shape, generated artifacts, restore-demo baseline.
6. **Guide Runbook**: desktop/sandbox/tenancy guide labs aligned to the real app and screenshots.

## Overlay Examples

The bundled asset `assets/template-overlays/industry-overlays.json` captures the reusable overlay vocabulary from:

- Higher Education: student success, campus services, advising, student requests.
- Life Sciences: regulated supply, cold chain, quality signals, trial sites.
- Media: content intelligence, audience signals, rights and distribution.
- SLED: resident services, public programs, service access.

Use those examples as patterns, not as hard-coded industries. For a new industry, synthesize a new overlay from the PRD or working brief and record it in `input/template-provenance.json`.

## Residue Rules

Generated bundles must not leak the wrong source lineage:

- Do not leave Newfold-specific language unless the requested industry is Newfold.
- Do not leave social-commerce table names or page labels visible in the app unless explicitly documented as internal compatibility and covered by domain-native views.
- Do not expose Tailwind dependencies, config, directives, or utility-class systems.
- Do not use `lucide-react` or other non-JET icon libraries for sidebar navigation, titles, controls, status, dataset actions, or Oracle Internals.
- Do not claim customer-data replacement if upload only flips dataset metadata.

## Required Provenance

Every generated bundle must include `input/template-provenance.json` with:

- `baseline`: approved golden baseline identifier.
- `baseline_version`: baseline contract version.
- `overlay_source`: PRD, brief, or named overlay example.
- `overlay_layers`: the six overlay layers above.
- `industry`: generated industry target.
- `pain_point`: generated pain point.
- `oracle_jet_redwood`: true.
- `ords_first`: true.
- `tailwind_allowed`: false.
