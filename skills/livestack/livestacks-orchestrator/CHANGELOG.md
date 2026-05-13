# Changelog

All notable changes to `livestacks-orchestrator` should be recorded in this file.

## Unreleased

## 0.1.0-preview.15 - 2026-05-13

- Added `scripts/grade_livestack_bundle.py`, an A+ grading gate that only passes generated bundles with clean semantic validation, neutral golden-core compose/env parity, ORDS-backed runtime evidence, Oracle JET / Redwood UI evidence, Oracle AI evidence, guide screenshot proof, red/green test evidence, and package hygiene.
- Added `validation/test-evidence.md` to the generated bundle contract so production-ready outputs record tests that failed before the change and passed after the change.
- Added `tests/test_grading_gate.py` with red/green coverage for A+ golden bundles, missing test evidence, and golden-core drift.
- Updated the orchestration workflow so `validate_livestack_bundle.py` is not the final gate; bundles only pass when `grade_livestack_bundle.py` reports `A+` and `Pass: yes`.

## 0.1.0-preview.14 - 2026-05-13

- Added `scripts/self_update.py` so each invocation can check the public GitHub `main` copy at `skills/livestack/livestacks-orchestrator` and install it automatically when the local skill differs.
- Added `update.json` with the canonical repo, branch, skill path, and validation command for the self-update contract.
- Kept the update path pragmatic: sparse Git clone, content-hash comparison, staged package validation, lock-protected replacement, no backups, and fail-soft behavior when GitHub, `git`, or validation is unavailable.
- Updated the skill quick start so Codex runs the updater before substantial orchestration work and re-reads `SKILL.md` after a successful install.

## 0.1.0-preview.13 - 2026-05-13

- Added `scripts/check_skill_package.py` for package-level release hygiene before sharing or embedding the skill: required-path checks, frontmatter checks, version-surface checks, Python script syntax checks, and transient cache/macOS metadata rejection.
- Hardened bundled helper installers and helper bundle sync scripts to exclude `__pycache__`, `.pyc`, `.DS_Store`, `._*`, `__MACOSX`, `.git`, and local test/cache artifacts.
- Removed generated Python bytecode caches from the installed skill package.

## 0.1.0-preview.12 - 2026-05-13

- Advanced to `0.1.0-preview.12`.
- Added semantic validation for complete dataset-admin route coverage: template download, validate-only preview, upload, restore-demo validate, restore-demo execute, active dataset state, and job-status routes.
- Added semantic validation that destructive dataset routes fail closed behind an admin-token, Authorization, CSRF, JWT, or equivalent operator-admin guard.
- Added semantic validation that direct app-to-database runtime access is documented as a bootstrap, migration, readiness, or admin exception rather than silently replacing ORDS-first application APIs.
- Fixed the default database bootstrap sequence to apply `030_ords.sql` and added validation so ORDS modules are not omitted from normal startup.
- Updated the neutral golden core baseline and default Express scaffold with `ADMIN_TOKEN` wiring, a fail-closed `requireAdmin` middleware, and the full dataset-admin starter route set.
- Tightened Oracle AI validation so vector/RAG claims must document embedding model, vector dimension, distance metric, index or exact-search mode, top-k retrieval, source/chunk attribution, and ANN-vs-exact behavior.
- Tightened Select AI validation so generated bundles must document scoped `object_list`, curated view or scoped object boundaries, `SHOWSQL` / `DBMS_CLOUD_AI.GENERATE` / deterministic template review, and read-only/no-DML/no-DDL guardrails.
- Tightened scaffold-marker detection for the current production-ready, multi-agent, Oracle AI, golden-core, guide, launch, and data-onboarding sections.
- Updated the default Express scaffold so `/healthz` and `/api/health` report real frontend, ORDS, and Ollama readiness and fail closed with HTTP 503 until the runtime is actually wired.

## 0.1.0-preview.11 - 2026-05-11

- Made multi-agent specialist execution the required default for `$livestacks-orchestrator` runs, with explicit ledger reasons required for any local fallback.
- Added an external-facing production-readiness gate covering protected destructive/admin routes, fail-closed dependency behavior, secret handling, CORS/HTTPS/token guidance, least-privilege boundaries, and real readiness checks.
- Added Oracle AI Database guidance from `$oracle-db-skills`: prefer Oracle AI Vector Search and DBMS_VECTOR/DBMS_VECTOR_CHAIN for semantic matching, triage, recommendations, evidence, and RAG; constrain Select AI / DBMS_CLOUD_AI to scoped NL-to-SQL, explain, summarize, translate, chat, or agent use cases.
- Added working-PRD and validation expectations for `ai_capability_mode`, `provider_boundary`, and `data_egress_caveat`, plus UI/Oracle Internals evidence for model/profile boundaries and data egress.
- Updated dataset-admin guidance and the default scaffold from the older bottom-left Upload Your Own Data pattern to top-right masthead controls for Oracle Internals and Upload Your Own Data.
- Hardened semantic validation for acceptance-checklist sections, concrete Oracle AI feature evidence, vector/RAG implementation clues, Select AI guardrails, provider-boundary documentation, and data-egress posture.

## 0.1.0-preview.10 - 2026-05-11

- Added the neutral golden LiveStack core plus overlay contract in `references/golden-core-overlay-contract.md`, including the rule that `/Users/mkowalik/projects/codey/workspace/livestack-template` is an overlay corpus rather than a raw template source.
- Added compact overlay examples from `highered`, `lifesciences`, `media`, and `sled` in `assets/template-overlays/industry-overlays.json`.
- Added a golden baseline manifest plus canonical `compose.yml` and `.env.example` files under `assets/templates/golden-livestack-baseline/`, and required generated bundles to carry `input/template-provenance.json` plus `docs/golden-core-overlays.md`.
- Hardened the contract so generated default LiveStacks keep `stack/compose.yml` and `stack/.env.example` aligned to the neutral golden core instead of drifting per industry, customer, app image, schema, ORDS module, or story.
- Updated the default scaffold to use known-rendering Oracle JET framework glyph classes (`oj-fwk-icon-*`) instead of unsupported app-chrome icon assumptions.
- Hardened semantic validation for canonical core files, golden-core provenance, required overlay layers, wrong-lineage residue, non-JET icon libraries such as `lucide-react`, `oj-ux-ico-*` glyph risk, Tailwind exclusion, and JET icon evidence.

## 0.1.0-preview.9 - 2026-05-11

- Added `scripts/sync_livestack_guide_builder_bundle.py` so maintainers can refresh the bundled `livestack-guide-builder` snapshot from the installed live skill without manual copy drift.
- Hardened the bundled `livestack-guide-builder` validator to check `output/guide-screenshots/inventory.json` and `inventory.md` when validating a full solution root, including required inventory keys, missing screenshot files, integrated guide images, and unreported capture failures.

## 0.1.0-preview.8 - 2026-05-11

- Added bundled `livestack-guide-builder` fixture tests for desktop manifest order, current-date scaffolds, screenshot inventory placeholders, and paired/wrapped copy-marker validation.
- Updated `livestack-guide-builder` scaffolding to create `output/guide-screenshots/inventory.json` and `inventory.md` with explicit capture-pending entries for each seeded scene, without overwriting existing screenshot inventories.

## 0.1.0-preview.7 - 2026-05-11

- Improved bundled `livestack-guide-builder` low-friction behavior: desktop manifests now prioritize local download/run instructions, scaffolded guide dates default to the current date, and the local reference guide path is documented as optional.
- Tightened guide copy-marker validation so paired `<copy>` markers and wrapped `<copy> ... </copy>` markers are still accepted, while malformed mixed marker blocks are rejected.

## 0.1.0-preview.6 - 2026-05-11

- Replaced the bundled `livelabs-workshop-author` dependency with the focused `livestack-guide-builder` skill.
- Added portable bundled install support for `livestack-guide-builder` and updated specialist discovery, role playbooks, package contracts, and guide delivery guidance to use it.
- Required every generated LiveStack guide to include `desktop`, `sandbox`, and `tenancy` workshop variants.
- Hardened guide validation so scene labs are treated as demo runbooks with user interactions, visible expected results, and business outcomes or signals.
- Updated copy-marker validation to accept paired `<copy>` markers as well as wrapped `<copy> ... </copy>` markers.

## 0.1.0-preview.5 - 2026-05-11

- Slimmed the bundled `redwood-creator` payload into an Oracle JET / Redwood app UI pack: all Oracle Sans font files are retained, while heavyweight guideline PDFs, component ZIP archives, and direct PNG references are removed from the default bundle.
- Tightened the generated app UI contract around Oracle JET framework patterns, Redwood theme imports, JET typography/font variables backed by Oracle Sans, and JET glyph classes for app chrome.
- Added Tailwind exclusion to the skill contract, fallback role guidance, default scaffold docs, and semantic validator.
- Hardened `scripts/validate_livestack_bundle.py` to fail Tailwind config/dependencies/directives, require JET/Redwood theme and typography evidence, and reject utility-first styling as the generated app UI foundation.

## 0.1.0-preview.4 - 2026-04-28

- Clarified the README and support matrix for the internal beta share, including first-iteration story/UI/data-upload expectations, zip-based macOS app distribution guidance, and known local runtime blockers.
- Promoted first-iteration story quality into the orchestration contract: sparse briefs now default to an `operator_workbench` first screen unless the working PRD justifies a broader showcase.
- Added working-PRD and UI-concept requirements for `primary_user_loop`, `first_scene_goal`, `first_interaction`, `first_decision_point`, `first_oracle_evidence`, `upload_your_own_data`, and `redwood_jet_ui_quality_bar`.
- Made `Upload Your Own Data` a first-iteration acceptance requirement for replaceable-demo LiveStacks, including visible CTA, dataset manager workflow, validate-only preview, upload/replace, active Oracle-backed dataset state, job status, restore-demo, guide coverage, and screenshot coverage.
- Raised the UI acceptance bar to premium Oracle Redwood / Oracle JET from the first iteration, with `$redwood-creator` App UI lane guidance, Oracle Sans, documented Redwood colors, restrained geometry, structural backgrounds, and Oracle JET icons for app controls.
- Reworked the default generated frontend starter from a static app-shell reminder into an interactive operator-workbench starter with scene navigation, primary CTA state changes, Oracle Internals evidence, JET icons, and the persistent `Upload Your Own Data` flow.
- Removed negative heading letter-spacing from the generated starter CSS to keep first-pass Redwood/JET typography cleaner.
- Hardened semantic validation to reject missing first-screen interactivity, missing dataset-admin runtime entry, missing Oracle Internals / Database X-Ray, weak Redwood/JET documentation, insufficient JET icon use, or missing first-iteration story keys.

## 0.1.0-preview.3 - 2026-04-24

- Tightened the production-ready LiveStacks contract so mock-backed, in-memory, or demo-state runtime fallbacks are rejected unless the user explicitly asked for a prototype.
- Added a normal-startup requirement that bundles with database artifacts must include an automated bootstrap path in `stack/` rather than relying on manual post-start SQL application.
- Hardened `scripts/validate_livestack_bundle.py` to fail bundles that ship ORDS SQL without real ORDS runtime wiring, bundles that admit mock-backed runtime behavior in docs or code, and bundles that omit automated database bootstrap evidence.
- Updated the default scaffold messaging in `scripts/init_livestack_bundle.py` so placeholder app shells state clearly that ORDS-backed flows and automated bootstrap are still required before a bundle can be called production-ready.

## 0.1.0-preview.2 - 2026-04-24

- Expanded the orchestration contract so first-completion LiveStacks must ship an explicit story architecture rather than a generic dashboard shell.
- Added Oracle feature inference requirements across the skill, references, and delivery contract so `$oracle-db-skills` is used to derive the minimum credible Oracle-native feature set when the brief does not name database capabilities directly.
- Added new required bundle fields for `story_mode`, numeric `scene_count_target`, `primary_cta_path`, candidate/chosen/rejected Oracle features, and feature-to-scene mapping.
- Hardened scaffold inspection and semantic validation so generated bundles are checked for story-contract completeness, guide scene alignment, and Oracle capability evidence consistency.
- Added `scripts/sync_oracle_db_bundle.py` as the maintainer refresh path for the bundled `$oracle-db-skills` snapshot and re-smoked the bundled installer flow against the refreshed Oracle helper payload.

## 0.1.0-preview.1 - 2026-04-24

- Added root release metadata files: `README.md`, `CHANGELOG.md`, `VERSION`, `NOTICE`, and `LICENSE`.
- Added `SUPPORT.md` as the public prerequisites and support matrix for the package.
- Added bundled-install support for `redwood-creator` so the orchestrator can carry its Oracle JET / Redwood dependency portably.
- Added `scripts/ensure_redwood_creator.py`.
- Hardened bundled installer scripts so `--dest-root` works even when the target skills directory does not already exist.
- Standardized the LiveStacks compose contract around:
  - fixed published ports in `compose.yml`
  - no port knobs in `.env` / `.env.example`
  - canonical ORDS bind mount `./ords-config:/etc/ords/config:Z,U`
  - Oracle Linux 9 / Podman portability expectations
- Promoted Oracle JET / Redwood to the default LiveStacks app UI system through `redwood-creator`.
- Added semantic bundle validation with `scripts/validate_livestack_bundle.py`.
