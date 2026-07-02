# Capability-Led Operator Application Contract

Use this reference when materializing a new LiveStack or reviewing whether a generated bundle followed the current golden application direction.

## Core Standard

Every generated LiveStack must be a **capability-led operator application**. Start with the best-fit Oracle AI Database 26ai feature usage patterns for the business pain point, then express those patterns through an operator workflow with:

- Command Center
- Data Foundation
- dynamic capability-backed workflow scenes
- Oracle logo/name lockup on the left
- left-side scene navigation using known-rendering Oracle JET `oj-fwk-icon-*` glyphs
- per-scene Oracle feature chips that show what will be demonstrated
- persistent top-right `Use Your Own Data`
- persistent clickable/collapsible, scene-aware right-side `Oracle Internals`
- a scene metadata manifest that drives navigation, guide order, screenshot names, primary CTAs, feature tags, and Oracle Internals payloads
- industry and pain-point overlays that change the domain without reducing Oracle feature evidence

## Source Model

The bundled `assets/template-overlays/industry-overlays.json` data preserves examples from a shared template family rather than defining unrelated golden templates.

- `highered`, `lifesciences`, `media`, and `sled` share one runtime and application scaffold.
- The industry-specific work lives mostly in navigation labels, scene names, seeded vocabulary, semantic views, prompts, guide language, and dataset-template wording.
- Treat those folders as an overlay corpus. Do not copy one industry folder raw and call it the golden template.
- The top-level `guide/` is a guide cadence reference only. It is not the direct guide for those four industry apps.

## Golden Runtime Core

Every default LiveStack should preserve one runtime core:

- four Podman services: `db`, `ords`, `ollama`, `app`
- fixed ports: `1521:1521`, `8181:8080`, `11434:11434`, `8505:3001`
- `./ords-config:/etc/ords/config:Z,U`
- explicit hostnames and `networks.default.aliases`
- one Node.js / Express app container serving a built Oracle JET / Redwood frontend
- app health at `/healthz`
- ORDS-first app APIs by default
- automated database and ORDS bootstrap under normal `podman compose up -d --build`
- persistent clickable/collapsible, scene-aware Oracle Internals or equivalent database X-Ray evidence backed by real routes, packages, SQL, Oracle feature usage, or runtime traces
- one canonical dataset-admin entry in the top-right app chrome, defaulting to `Use Your Own Data`
- Oracle logo/name lockup and left-side scene navigation with `oj-fwk-icon-*` scene glyphs
- per-scene Oracle feature chips or tags in the navigation and active scene surface
- scene manifest metadata for scene id, label, title, navigation glyph, Oracle feature tags, primary CTA, guide/screenshot name, and Oracle Internals payload
- Oracle JET Redwood theme, Oracle Sans, JET typography variables, and Oracle JET framework glyph classes
- no Tailwind, no utility-first replacement class system, and no non-JET icon library for app chrome

## Invariant Core Files

The source template family kept `.env.example` stable across industries and varied `compose.yml` only by generated app image name. The bundled golden baseline is stricter:

- `stack/compose.yml` must match `assets/templates/golden-livestack-baseline/compose.yml`.
- `stack/.env.example` must match `assets/templates/golden-livestack-baseline/.env.example`.
- Do not put industry names, customer names, app image names, schema names, ORDS module names, or story labels in either file.
- Keep industry and pain-point variation in app code, database artifacts, seed/config data, docs, guide content, and `input/template-provenance.json`.
- If a future solution truly needs an extra service, record it as an explicit architecture exception before changing the core runtime contract.

## Overlay Layers

Apply overlays in this order:

1. **Oracle 26ai Capability Strategy**: selected primary and secondary Oracle features, why they fit the pain point, and rejected alternatives.
2. **Feature Usage Pattern**: semantic matching, RAG, safe NL-to-SQL, guided agent workflow, explainable recommendation, optimization, anomaly/risk scoring, or other justified Oracle-native pattern.
3. **Industry Vocabulary**: user-facing labels, roles, nouns, seeded examples, domain glossary.
4. **Pain-Point Workflow**: primary user loop, queue, decision, exception path, and measurable outcome.
5. **Dynamic Scene Architecture**: Command Center, Data Foundation, and the right-sized set of capability-backed scenes needed to prove the operator story. Do not force a fixed scene count.
6. **Oracle Capability Map**: chosen Oracle features and the exact scene evidence that proves them.
7. **Data Contract**: source records, importable CSV/JSON shape, generated artifacts, restore-demo baseline.
8. **Guide Runbook**: desktop/sandbox/tenancy guide labs aligned to the real app and screenshots.

## Operator Experience Pattern

The experience is stable even as industries change:

- Command Center opens on a real operator decision and primary CTA.
- Data Foundation explains the active dataset, import contract, and Oracle-backed model.
- Each workflow scene proves a business outcome and at least one Oracle capability or deliberate Oracle architectural choice.
- Each scene is visually and behaviorally distinct: a scene-specific component/page module, distinct interaction pattern, scene-local state, visible domain objects, real Oracle evidence per scene, and workflow handoff must be visible in the app and named in screenshot captions.
- Navigation sits on the left as a scene rail with Oracle JET glyphs and feature chips, so the operator can see both the journey and the Oracle capabilities being demonstrated.
- Oracle Internals is a persistent clickable/collapsible right-side control, populated by the active scene, and specific about ORDS routes, SQL, PL/SQL packages, vector/AI usage, provider boundaries, data-egress posture, and security evidence. Each scene uses a technical exhibit shape: `What's Happening`, capability badges, SQL/PLSQL, architecture/data-flow boxes, governance/security callout, and live evidence.
- `Use Your Own Data` is a top-right utility that opens the dataset manager for template, validate, upload/replace, restore-demo, active dataset state, and job status.
- When `Use Your Own Data` is open, Oracle Internals switches to dataset-governance evidence rather than leaving the previous scene's content in place.

## Overlay Examples

The bundled asset `assets/template-overlays/industry-overlays.json` captures the reusable overlay vocabulary from:

- Higher Education: student success, campus services, advising, student requests.
- Life Sciences: regulated supply, cold chain, quality signals, trial sites.
- Media: content intelligence, audience signals, rights and distribution.
- Healthcare: provider network operations, care pathways, quality/capacity signals, and care service requests.
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
- `experience_pattern`: `capability-led operator application` when present.
