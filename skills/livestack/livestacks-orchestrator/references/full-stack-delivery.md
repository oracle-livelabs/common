# Full Stack Delivery

Use this built-in fallback when no installed implementation skill is a strong match for the current LiveStacks run. The role is responsible for turning the working PRD into a coherent runnable application shape.

## Own

- app and service boundaries
- backend and frontend contracts
- runtime topology
- story-mode-aware application scaffolding
- first-screen interactivity
- dataset onboarding flow when customer data replacement is in scope
- Oracle evidence plumbing for the app
- Oracle AI evidence plumbing for vector/RAG, DBMS_VECTOR/DBMS_VECTOR_CHAIN, Select AI / DBMS_CLOUD_AI, deterministic NL-to-SQL, or local Ollama-assisted application flows when chosen
- premium Oracle Redwood / Oracle JET implementation quality
- environment and container structure
- external-facing production behavior

## Required Artifacts

- `stack/compose.yml`
- `stack/Containerfile`
- `stack/.env.example`
- `docs/ui-concept.md`
- `docs/deployment-guide.md`
- `docs/customer-rebuild.md`

## Workflow

1. Map the working PRD into a concrete file tree and service topology.
2. Keep the default LiveStacks four-service runtime unless the user explicitly requires a justified exception.
3. Read `story_mode`, `scene_count_target`, `primary_user_loop`, `primary_cta_path`, `first_scene_goal`, `first_interaction`, `first_decision_point`, `first_oracle_evidence`, `upload_your_own_data`, `redwood_jet_ui_quality_bar`, and feature-to-scene mapping from the working PRD before shaping the frontend shell.
4. When no framework preference is given, start from the neutral golden LiveStack core and apply overlays for industry vocabulary, pain-point workflow, story scenes, Oracle capability mapping, data/import contract, and guide/runbook content. Keep `stack/compose.yml` and `stack/.env.example` identical to the golden baseline assets; move domain-specific variation into app code, database artifacts, seed/config data, docs, and guide content. Keep the runtime shape as a single Node.js / Express backend that serves a built Oracle JET / Redwood frontend shell from the same `app` container.
5. Use the story mode to shape the default shell:
   - `operator_workbench`: compact 4-5 scene analyst or operator flow with a persistent guided next step
   - `converged_showcase`: broader multi-scene Oracle capability story with a stronger welcome or orientation entry
   - `hybrid`: operator-first entry plus additional capability scenes
6. Default sparse briefs to `operator_workbench`; do not generate a generic dashboard or static welcome screen as the first experience.
7. Make the first app scene interactive: one primary CTA should change UI state and be designed to call an app API that is backed by ORDS in the final implementation.
8. If the user explicitly requests a different stack such as Flask or FastAPI, honor that request and adapt the bundle shape accordingly instead of forcing the default scaffold.
9. Route application reads and writes through ORDS-mediated APIs by default.
10. Do not substitute in-memory mock state, fake business data modules, or demo-state runtime fallbacks unless the user explicitly requested a prototype. If the current run is only a prototype, label it that way and record the production gaps.
11. When database artifacts exist, wire an automated bootstrap path into the normal startup flow so `podman compose up -d --build` is sufficient to reach a usable schema plus ORDS state. Manual SQL apply steps belong only in recovery notes.
12. Define the dataset import, validate, upload, status, and restore contract when demo data is replaceable, and by default surface it behind a persistent top-right masthead utility labeled `Upload Your Own Data` that opens an overlay dataset manager.
13. Use `$redwood-creator` when it is installed, including when it was installed earlier from the bundled snapshot, for App UI lane decisions: Oracle JET framework components, Redwood theme import, JET typography/font variables backed by Oracle Sans, documented Redwood colors, JET glyph/icon classes, restrained geometry, contrast, marketing-icon exclusions, and Tailwind exclusion.
14. Define how the app surfaces Oracle Internals or database X-Ray evidence, including concrete AI fields when an AI feature is selected: embedding model, vector dimension, distance metric, index type, top-k/source attribution, Select AI profile/action, generated SQL review state, local/external model boundary, and data-egress caveat.
15. Keep configuration externalized and portable across local and enterprise rebuilds.
16. Preserve `input/template-provenance.json` and update it whenever the selected industry, pain point, story mode, or overlay source changes.
17. Make the app production-credible for external users: protect destructive/admin routes, fail closed when Oracle/ORDS/AI dependencies are unavailable, keep secrets out of source and UI, document CORS/HTTPS/token assumptions, and make `/healthz` reflect real readiness rather than a static heartbeat.

## Minimum Outputs

`stack/compose.yml` and related runtime artifacts should show:

- `db`, `ords`, `app`, and `ollama`
- `stack/compose.yml` and `stack/.env.example` matching the neutral golden baseline files, not per-industry rewrites
- fixed published ports with the canonical app mapping `8505:3001`
- no `APP_PORT`, `DB_PORT`, `ORDS_PORT`, or `OLLAMA_PORT` in `.env` or `.env.example`
- explicit `hostname` and matching aliases
- the canonical ORDS config bind mount `./ords-config:/etc/ords/config:Z,U`
- compose syntax that stays portable under Podman on Oracle Linux 9
- an Oracle JET / Redwood frontend shell with Redwood theme wiring, JET typography/font variables backed by Oracle Sans, and JET glyph/icon usage for app controls/sidebar/titles
- no `lucide-react`, non-JET SVG icon packs, emoji icons, Tailwind, or utility-first replacement class systems in app chrome
- a premium operator-workbench first screen with a primary CTA, state change, and scene-aware Oracle evidence
- a persistent top-right `Upload Your Own Data` masthead utility plus dataset manager flow when demo data is replaceable, including template, validate, upload, restore-demo validate, restore-demo execute, state, and job-status APIs
- visible AI capability evidence in Oracle Internals when AI is in scope, not hidden model calls or vague “AI-powered” copy
- app healthcheck against `/healthz`
- no secret values committed into source

`docs/ui-concept.md` and `docs/deployment-guide.md` should explain:

- screen or scene inventory
- story mode, `scene_count_target`, and primary CTA path
- first-screen interaction and primary decision point
- Oracle JET / Redwood component, typography, and icon plan, including Oracle JET font variables, Oracle Sans, and Oracle JET glyphs for app controls
- operator dataset-admin flow when relevant, including the default top-right `Upload Your Own Data` masthead utility unless the user explicitly requested another pattern
- Oracle Internals or X-Ray presentation
- Oracle AI evidence presentation and data-egress posture when AI is selected
- local startup path and health expectations
- customer rebuild expectations

## Failure Modes To Prevent

- direct app-to-table coupling without a documented bootstrap, migration, readiness, or strict admin justification
- compose or docs drift from the fixed LiveStacks runtime contract
- generating a generic dashboard shell that ignores the chosen story mode or scene count
- generating a static first screen with no meaningful operator action or state change
- published port numbers duplicated into env knobs or ORDS config mounts that drift from the canonical Podman / Oracle Linux 9 contract
- generic non-JET UI or Redwood-incompatible control/icon usage in the default app path
- Tailwind config, `tailwindcss`, `@tailwind`, or utility-first styling systems in generated app UI
- `lucide-react` or other non-JET icon libraries used for app navigation, controls, titles, dataset actions, status, or Oracle Internals
- dataset replacement paths that omit template download, validate-only preview, active dataset state, restore-demo validation, restore-demo execution, job status, or fail-closed destructive-route protection
- Oracle evidence described in prose but not wired to real routes or runtime behavior
- shipping ORDS SQL and package APIs without the app actually proxying or calling them at runtime
- requiring operators to run manual SQL apply steps after startup because the bundle never automated database bootstrap
- calling a mock-backed or in-memory data path production-ready when the user never asked for a prototype
- shipping generated AI behavior that cannot identify its Oracle feature, model/profile boundary, source attribution, or data-egress posture
- leaving destructive dataset or admin routes open without operator intent and a documented protection boundary
