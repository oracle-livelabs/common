# Package Contract

Use this contract for every generated solution. If the user asks only for design, still describe this package and populate the highest-value artifacts.

## Required Narrative Sections

Every run must include:

1. Problem framing
2. Proposed solution
3. Architecture decisions
4. Data design
5. UI concept
6. Implementation plan
7. Risks and challenge review
8. Final recommended LiveStacks package contents

Every run must also make the story shape explicit:

- classify the solution into a story mode such as `operator_workbench`, `converged_showcase`, or `hybrid`
- justify the recommended `scene_count_target` from the workflow and inferred Oracle feature breadth
- define a primary CTA path instead of relying only on generic navigation or dashboards
- define `primary_user_loop`, `first_scene_goal`, `first_interaction`, `first_decision_point`, and `first_oracle_evidence`
- default sparse briefs to an operator-workbench first iteration unless the working PRD justifies a broader showcase

Every production-ready run must also make the runtime truth explicit:

- unless the user explicitly requested a prototype or mock, the delivered runtime must not depend on mock-backed or in-memory business data paths
- if the bundle ships schema, ORDS, security, or seed SQL artifacts, the normal `podman compose up -d --build` path must include an automated bootstrap path under `stack/`
- if the bundle ships ORDS modules or ORDS SQL, the app runtime must actually proxy or call those routes rather than only mentioning `ORDS_BASE_URL` in docs, health payloads, or placeholder copy
- the first app screen must be interactive, with a visible primary operator action that changes state and is designed to call ORDS-backed app APIs
- the app UI must look like a polished Oracle Redwood / Oracle JET application from the first iteration, not a generic dashboard, Tailwind shell, or unstyled scaffold
- every generated bundle must be production-credible for external users by default: protected destructive/admin routes, fail-closed dependency behavior, externalized secrets, CORS/HTTPS/token guidance, least-privilege ORDS/app identities, and a `/healthz` readiness path tied to real dependencies
- every generated app should include a visible AI capability unless the working PRD explicitly rejects AI with a documented reason; Oracle Internals must show the chosen AI mode, Oracle feature, model/profile boundary, and data-egress caveat
- every generated bundle must record red/green test evidence: which tests failed before the final change, which same tests passed after the change, and the A+ grading report
- `scripts/grade_livestack_bundle.py <solution-root>` must return `A+` and `Pass: yes` before the bundle is called production-ready

## Role-Owned Artifact Expectations

The following roles may be served by installed skills or by built-in orchestrator fallbacks, but their artifacts are required either way:

- Project Manager: `docs/implementation-plan.md`, convergence notes in `docs/architecture-decisions.md`, and validation alignment in `validation/launch-checklist.md`
- Solution Engineer: `input/working-prd.md`, `docs/problem-framing.md`, `docs/proposed-solution.md`, and `docs/feature-inventory.md`
- Full Stack Developer: `stack/compose.yml`, `stack/Containerfile`, `stack/.env.example`, `docs/ui-concept.md`, and `docs/deployment-guide.md`
- Devil's Advocate: `docs/risks-and-review.md`, rejected alternatives in `docs/architecture-decisions.md`, and the production-readiness bar in `validation/acceptance-checklist.md`

## PRD And Working PRD Pattern

Every production-ready LiveStacks bundle should preserve the source requirements trail and one compact execution contract.

- Persist raw user input in `input/business-input.md`.
- Persist the source PRD in `input/product-requirements.md`, or explicitly record that no source PRD was provided for the run.
- Always create `input/working-prd.md` before the specialist wave starts.
- Treat `input/working-prd.md` as the source of truth for architecture, data design, UI concept, implementation planning, guide authoring, and validation.
- When the user only provides a brief, `input/working-prd.md` should be a synthesized compact build contract rather than a heavyweight formal PRD.
- Keep inferred items explicitly marked as `Assumption:` until confirmed.

## Dataset Admin Pattern

When the solution ships demo data that a customer is expected to replace, include this operator-only workflow unless the user explicitly asks for a different pattern:

- a persistent top-right masthead utility labeled `Upload Your Own Data` as the default operator entry point in the application chrome
- that CTA should open a reusable overlay dataset manager surface for later imports or resets
- template archive download for the supported import shape
- validate-only preview before any destructive dataset replacement
- destructive upload or replace flow with job progress or status polling
- destructive upload, replace, and restore-demo routes must fail closed behind an `ADMIN_TOKEN`, `Authorization` header, CSRF boundary, or equivalent operator-admin guard
- active dataset state persisted in Oracle, for example an `APP_DATASET_STATE` table, and surfaced in the UI
- restore-demo or restore-baseline flow
- explicit documentation of which files or tables are importable source data versus regenerated derived artifacts
- prefer a stable app-owned `/api/import/*` style contract unless the project already has a stronger existing convention
- the preferred route set is `GET /api/import/dataset`, `GET /api/import/template`, `POST /api/import/validate`, `POST /api/import/upload`, `POST /api/import/restore-demo/validate`, `POST /api/import/restore-demo`, and `GET /api/import/status/:jobId`
- treat this as a first-iteration acceptance requirement for replaceable-demo LiveStacks, including app UI, API contract, Oracle-backed state, guide coverage, and screenshot coverage

## Oracle AI Pattern

Generated LiveStacks should make Oracle AI Database features visible and useful, not decorative.

- Prefer Oracle AI Vector Search and DBMS_VECTOR/DBMS_VECTOR_CHAIN for semantic matching, triage, recommendations, evidence retrieval, knowledge assistance, and RAG flows.
- Store source attribution with chunks and embeddings. Surface source, chunk id, top-k, embedding model, vector dimension, distance metric, index type, target accuracy, and exact-vs-ANN retrieval mode in Oracle Internals when vector/RAG is selected.
- Use Select AI / DBMS_CLOUD_AI only when the app needs NL-to-SQL, explain SQL, summarize, translate, chat, or agent workflows. Scope `object_list` to curated views when possible, use comments or annotations, prefer deterministic settings, and make `SHOWSQL` or a deterministic template path the review step before any read-only execution.
- Do not expose arbitrary `runsql`, DML, DDL, or PL/SQL execution as a default user path. Ambiguous natural-language prompts should ask for clarification.
- Surface provider boundary and data-egress posture in the UI: local Ollama only, external AI provider via DBMS_VECTOR or Select AI, metadata-only SQL generation, retrieved chunks/results sent to provider, or no LLM.
- `docs/oracle-capability-map.md` must record selected and rejected AI capabilities, required Oracle dependencies, scene evidence mapping, security caveats, and customer rebuild implications.

## Golden Core And Overlay Pattern

Default LiveStacks are generated from a neutral golden core plus overlays, not from a raw industry folder.

- The neutral golden core owns runtime topology, fixed ports, ORDS-first API flow, `/healthz`, dataset-admin shape, Oracle Internals, Oracle JET / Redwood styling, Oracle Sans, and JET glyph iconography.
- The neutral golden core also owns `stack/compose.yml` and `stack/.env.example`. Those files must stay the same across generated default LiveStacks; do not use them for industry, customer, story, schema, app-image, or ORDS-module variation.
- Industry folders such as `highered`, `lifesciences`, `media`, and `sled` from `/Users/mkowalik/projects/codey/workspace/livestack-template` are overlay examples. They should inform labels, scenes, semantic views, seeded vocabulary, prompts, and guide wording.
- Every generated bundle must include `input/template-provenance.json` naming the baseline, baseline version, overlay source, industry, pain point, and overlay layers.
- Apply overlays in this order: industry vocabulary, pain-point workflow, story scenes, Oracle capability map, data contract, guide runbook.
- Do not leak wrong-industry residue. Newfold terms, social-commerce UI labels, and inherited table names should not appear in customer-facing surfaces unless the requested domain justifies them and the compatibility layer is documented.

## Oracle Evidence Pattern

Every application bundle should include one visible Oracle evidence surface unless the user explicitly asks not to:

- a shared Oracle Internals panel like `social-commerce-livestack`, or a dedicated database X-Ray mode
- scene-aware or workflow-aware content rather than one static architecture blurb
- concrete evidence such as ORDS route names, package or procedure names, generated SQL, feature badges, execution-flow diagrams, or runtime traces
- a clear explanation of where the LLM runtime stops and Oracle Database remains the execution or system-of-record layer
- safe disclosure only: do not expose secrets or unsafe internal-only values

## Guide Pattern

Every production-ready LiveStacks bundle should include a sibling `guide/` workshop that documents the real application in `stack/`.

- Author the guide with `$livestack-guide-builder` when it is installed. If it is missing, first try `scripts/ensure_livestack_guide_builder.py`, and only then use the local runbook rules shipped inside `$livestacks-orchestrator`.
- Treat the guide as the LiveStack demo runbook, not a generic workshop or detached reference document.
- Keep the guide scene-by-scene aligned to the visible application navigation and local operator flow.
- Each scene lab must explain what is happening, what the user should interact with, what changes on screen, and what expected outcome or business signal the user should take away.
- Include introduction, local-run/download, per-scene labs, conclusion, and desktop, sandbox, and tenancy workshop manifests.
- Treat `workshops/*/index.html` as read-only canonical LiveLabs shell files. Do not edit them unless the user explicitly asks for workshop-shell changes.
- Accept both LiveStack copy marker styles: paired `<copy>` markers before and after a command, and wrapped `<copy> ... </copy>` markers.
- Capture screenshots from the real running app with installed automated browser tooling when available and integrate selected images into the relevant `guide/**/images/` folders.
- Treat `$playwright` or `$webapp-testing` as optional screenshot helpers rather than mandatory auto-installed dependencies.
- Keep screenshot artifacts and metadata under `output/guide-screenshots/`, including `inventory.json` and `inventory.md`.

## Golden LiveStack Baseline

When the user does not specify an application framework, the default generated scaffold should instantiate the neutral golden LiveStack baseline and then apply domain overlays:

- one Node.js / Express backend inside the `app` service
- one Oracle JET / Redwood frontend built and served by that same `app` service
- a premium operator-workbench starter rather than a static welcome page or generic overview dashboard
- Redwood theme wiring, Oracle JET typography/font variables backed by Oracle Sans, documented Redwood colors, and Oracle JET glyph/icon classes for application controls, sidebar navigation, titles, status, dataset actions, and Oracle Internals
- no Tailwind config files, `tailwindcss` dependency, `@tailwind` directives, or utility-first class systems
- no `lucide-react`, SVG icon packs, emoji icons, or non-JET icon libraries for app chrome, navigation, buttons, titles, status, dataset actions, or Oracle Internals
- no Redwood marketing pictograms in application chrome, navigation, or data controls
- visible Oracle AI capability evidence in at least one scene, unless explicitly rejected in the working PRD
- the same fixed LiveStacks runtime contract around `db`, `ords`, `app`, and `ollama`
- the same `stack/compose.yml` and `stack/.env.example` baseline files from `assets/templates/golden-livestack-baseline/`, with domain-specific configuration moved elsewhere

If the user explicitly requests a different stack such as Flask or FastAPI, that request is sufficient justification to use a different app layout. Equivalent framework-specific layouts are first-class options as long as they preserve the fixed app port, `/healthz`, ORDS-first API flow, and Oracle-evidence surface.

The default scaffold is only a starting point. It is not production-ready until the bundle replaces starter runtime code with domain-specific ORDS-backed flows, a real Oracle evidence surface, a working `Upload Your Own Data` dataset manager when demo data is replaceable, an automated database bootstrap path where database artifacts exist, and screenshot-backed guide evidence.

## Canonical Bundle Tree

```text
<solution-slug>/
  input/
    business-input.md
    product-requirements.md
    working-prd.md
    assumptions.md
    template-provenance.json
  docs/
    problem-framing.md
    proposed-solution.md
    architecture-decisions.md
    data-design.md
    ui-concept.md
    implementation-plan.md
    feature-inventory.md
    oracle-capability-map.md
    risks-and-review.md
    deployment-guide.md
    customer-rebuild.md
    runbook.md
  guide/
    introduction/
      introduction.md
    download-livestack/
      download-livestack.md
    scene-01-<scene-slug>/
      scene-01-<scene-slug>.md
      images/
        <capture>.png
    conclusion/
      conclusion.md
    workshops/
      desktop/
        index.html
        manifest.json
      sandbox/
        index.html
        manifest.json
      tenancy/
        index.html
        manifest.json
  stack/
    compose.yml
    Containerfile
    .env.example
    package.json
    backend/
      server.js
    frontend/
      package.json
      vite.config.js
      index.html
      src/
        App.jsx
        main.jsx
        styles.css
    scripts/
      bootstrap_ollama_models.sh
      bootstrap_ollama_models.ps1
  database/
    migrations/
      changelog-root.xml
      changes/
        001-baseline.sql
    sql/
      020_api_packages.sql
      030_ords.sql
      040_security.sql
    seed/
      050_demo_seed.sql
  validation/
    acceptance-checklist.md
    launch-checklist.md
    data-onboarding-checklist.md
    test-evidence.md
  output/
    guide-screenshots/
      inventory.json
      inventory.md
```

## File Responsibilities

- `input/business-input.md`: the raw business brief, notes, or source snippets captured for the run
- `input/product-requirements.md`: the source PRD when provided, or an explicit record that the run started without one
- `input/working-prd.md`: the compact execution contract used for delegation and downstream build decisions
- `input/assumptions.md`: explicit assumptions and scope boundaries
- `docs/problem-framing.md`: the business problem, users, business outcomes, and why it matters now
- `docs/proposed-solution.md`: the recommended solution narrative and why this LiveStacks shape is the right fit
- `docs/architecture-decisions.md`: chosen architecture, tradeoffs, rejected alternatives, chosen implementation or convergence record, and the chosen Oracle evidence approach when relevant
- `docs/data-design.md`: schema, ingestion, ORDS, Oracle feature usage, dataset onboarding or state strategy when relevant, and the evidence path the app will expose
- `docs/ui-concept.md`: journeys, story mode, first-scene interaction, scene sequence, primary CTA path, screen map, premium Oracle JET / Redwood component mapping, Oracle JET icon plan, interaction notes, the operator dataset admin flow when demo data is replaceable, including the default top-right `Upload Your Own Data` masthead utility, and the Oracle Internals or DB X-Ray experience
- `docs/implementation-plan.md`: milestones, dependencies, critical path, validation plan, and build plan
- `docs/feature-inventory.md`: user-visible, operator, and Oracle-evidence features in MVP scope plus deferred items
- `docs/oracle-capability-map.md`: why Oracle AI Database 26ai is indispensable, which capabilities were considered, which were chosen or rejected, how they map to business needs, how the AI provider/model boundary and data-egress posture are handled, and how those capabilities surface scene-by-scene in the app
- `docs/risks-and-review.md`: challenged assumptions, devil's-advocate findings, revisions made, and remaining accepted risks
- `docs/deployment-guide.md`: environment setup and deployment instructions
- `docs/customer-rebuild.md`: how a customer replaces demo data, validates uploads, restores the baseline dataset, and adapts the bundle
- `docs/runbook.md`: operations, health checks, and support expectations
- `guide/introduction/introduction.md`: workshop overview, prerequisites, and scene map
- `guide/download-livestack/download-livestack.md`: local run and verification path tied to the actual distributed bundle layout, using `stack/` only when the artifact truly ships that extra level
- `guide/scene-*/scene-*.md`: scene or operator-flow labs aligned to the visible application
- `guide/conclusion/conclusion.md`: closing recap and next steps
- `guide/workshops/*/manifest.json`: workshop entrypoints and tutorial order
- `guide/workshops/*/index.html`: read-only canonical LiveLabs shell files; do not edit unless the user explicitly asks for shell changes
- `stack/compose.yml`: portable service topology with fixed published ports, explicit service DNS wiring, and the canonical ORDS config bind mount for Podman-friendly local runs
- `stack/Containerfile`: app image build contract
- `stack/.env.example`: non-secret configuration keys without redundant published-port variables
- `stack/package.json`: default Node.js app manifest for the single `app` service
- `stack/backend/server.js`: default Express entrypoint that exposes `/healthz`, app APIs, and the built frontend
- `stack/frontend/package.json`: frontend build manifest for the default Oracle JET / Redwood shell
- `stack/frontend/vite.config.js`: default Vite configuration for the frontend shell
- `stack/frontend/index.html`: frontend root HTML document for the built app
- `stack/frontend/src/*`: default Oracle JET / Redwood shell entrypoint, theme wiring, layout, icon usage, and styling
- `stack/scripts/bootstrap_ollama_models.sh`: POSIX host bootstrap wrapper for pulling and warming Ollama models through the published host endpoint
- `stack/scripts/bootstrap_ollama_models.ps1`: Windows host bootstrap wrapper for the same Ollama pull and warmup flow
- `output/guide-screenshots/inventory.json`: structured screenshot inventory with file, view, caption, alt, and note fields
- `output/guide-screenshots/inventory.md`: human-readable screenshot inventory and failure report
- `database/migrations/*`: versioned schema changes
- `database/sql/020_api_packages.sql`: package API seams and core business logic
- `database/sql/030_ords.sql`: ORDS schema enablement, modules, templates, handlers
- `database/sql/040_security.sql`: roles, grants, policies, and audit setup
- `database/seed/050_demo_seed.sql`: demo seed data only
- `validation/acceptance-checklist.md`: external readiness, multi-agent execution evidence, Oracle feature evidence, security posture, live runtime proof, remaining risks, and outcome checks
- `validation/launch-checklist.md`: environment, startup, health, and first-run verification checks
- `validation/data-onboarding-checklist.md`: validate-only, upload, restore-demo, and derived-artifact rebuild checks for customer data flows
- `validation/test-evidence.md`: red tests that failed before the final fix, green tests that passed after the fix, A+ grading output, and golden-core parity evidence

## Minimum Configuration Surface

Document the variables the bundle expects. At a minimum, define or justify:

- `APP_ENV`
- `ADMIN_TOKEN`
- `ORDS_BASE_URL`
- `ORDS_PUBLIC_URL`
- `DB_HOST`
- `DB_SERVICE`
- `DB_APP_USER`
- `DB_APP_PASSWORD`
- `ORACLE_PWD`
- `OLLAMA_BASE_URL`
- `OLLAMA_HOST_URL`
- `OLLAMA_MODEL`
- `OLLAMA_EXTRA_MODELS`

Add optional variables only when a service or feature truly needs them.
Do not add `APP_PORT`, `DB_PORT`, `ORDS_PORT`, or `OLLAMA_PORT` to the default configuration surface. The canonical four-service scaffold keeps both the internal and published port contract in `compose.yml`, with the app fixed at `3001` inside the container and `8505:3001` on the host.
Treat `OLLAMA_EXTRA_MODELS` as a comma-separated list when more than one extra model is required.

## Done Criteria

Do not call the package production-ready unless all of the following are true:

- `input/business-input.md`, `input/product-requirements.md`, and `input/working-prd.md` exist, and the working PRD is the current source of truth for the bundle.
- The bundle has a coherent file tree with real content in the critical artifacts.
- `compose.yml` names the baseline services and any justified optional services.
- `compose.yml` preserves the fixed-port contract, uses top-level `networks.default`, and mounts ORDS config with `./ords-config:/etc/ords/config:Z,U`.
- Portable Ollama bootstrap wrappers exist for POSIX `sh` and PowerShell, and the docs explain when and how to run them.
- `.env.example` does not reintroduce redundant published-port variables such as `APP_PORT`, `DB_PORT`, `ORDS_PORT`, or `OLLAMA_PORT`.
- The frontend contract is polished Oracle JET / Redwood rather than a generic web UI, and its controls use Oracle JET iconography rather than Redwood marketing pictograms.
- `docs/feature-inventory.md` and `docs/oracle-capability-map.md` explain the MVP scope and why Oracle AI Database 26ai is indispensable to the solution.
- The bundle declares a story mode, a `scene_count_target`, and a primary CTA path rather than only a static screen inventory.
- The bundle declares `primary_user_loop`, `first_scene_goal`, `first_interaction`, `first_decision_point`, `first_oracle_evidence`, `upload_your_own_data`, and `redwood_jet_ui_quality_bar`.
- The first app scene has a visible operator action, a state change, and scene-aware Oracle evidence rather than only a static overview.
- Every chosen Oracle capability maps to at least one visible scene or operator workflow and to one Oracle evidence surface.
- At least one Oracle AI capability is implemented and visible, or AI is explicitly rejected in `input/working-prd.md` and `docs/oracle-capability-map.md`.
- Oracle Internals names the AI capability mode, model/profile/provider boundary, source attribution where relevant, and data-egress caveat.
- `docs/problem-framing.md`, `docs/proposed-solution.md`, `docs/implementation-plan.md`, and `docs/risks-and-review.md` are populated as real role-owned artifacts, not left as generic shells.
- The `guide/` workshop exists as a LiveStack demo runbook and is aligned to the actual app scenes and local run flow.
- The guide validator passes, and workshop manifests are populated for desktop, sandbox, and tenancy variants.
- Each scene lab explains what is happening, what the user should interact with, what changes on screen, and what expected outcome or business signal appears.
- The guide uses either paired `<copy>` markers or wrapped `<copy> ... </copy>` command markers consistently enough for the guide validators to pass.
- `guide/workshops/*/index.html` was not edited and still matches the canonical LiveLabs shell bundled with `livestack-guide-builder`.
- The app architecture and file structure are explicit.
- ORDS routing and package API strategy are explicit.
- Schema, migrations, and demo seed data are versioned.
- Security and portability constraints are addressed, not hand-waved.
- Customer rebuild guidance explains how to replace demo data with real customer data.
- The first scene or operator entry establishes Oracle AI Database 26ai as the actor in the workflow, not only as a platform label in the chrome.
- If demo data is replaceable, the bundle includes the dataset admin flow with the default top-right `Upload Your Own Data` masthead utility plus template download, validate-only preview, upload or replace, active dataset state, and demo restore, unless the user explicitly requested another entry pattern.
- If demo data is replaceable, `Upload Your Own Data` is working in the first app iteration and covered by the guide; it is not only a documented future path.
- The application includes a credible Oracle Internals panel or database X-Ray mode tied to real runtime behavior.
- Destructive/admin routes are protected, external-facing security boundaries are documented, and `/healthz` is a meaningful readiness check rather than only a process heartbeat.
- The dataset route set includes template download, validate-only preview, upload or replace, restore-demo validate, restore-demo execute, active dataset state, and job status; destructive routes fail closed without the configured operator-admin token or equivalent auth boundary.
- Any direct app-to-database runtime path is explicitly documented as a bootstrap, migration, readiness, or admin exception. Normal application APIs route through ORDS.
- The runtime does not depend on mock-backed, in-memory, or demo-state business data flows unless the user explicitly asked for a prototype and the bundle is labeled accordingly.
- When database artifacts exist, the bundle includes an automated bootstrap path in `stack/` for the normal startup flow rather than requiring manual post-start SQL application.
- When ORDS SQL exists, the app runtime actually proxies or calls ORDS in code rather than exposing ORDS only as configuration or narrative text.
- `validation/launch-checklist.md`, `validation/data-onboarding-checklist.md`, and `validation/acceptance-checklist.md` exist and match the current build contract.
- Screenshot inventory exists under `output/guide-screenshots/`, failures are resolved or explained, and selected real app captures are integrated into the guide image folders.
- `python3 scripts/find_scaffold_markers.py <solution-root>` returns no blockers, unless the user explicitly asked for a skeleton.
- `python3 scripts/validate_livestack_bundle.py <solution-root>` returns no semantic errors, including compose or env drift, broken guide manifest refs, weak screenshot inventory structure, mock-backed runtime fallbacks, missing automated bootstrap, or missing ORDS runtime wiring.
- Remaining risks are surfaced clearly.
