# LiveStacks Orchestrator

Version: see [`VERSION`](./VERSION)

`livestacks-orchestrator` turns a PRD, partial PRD, or minimal business brief into one Oracle-first LiveStacks solution bundle with:

- working-PRD synthesis
- first-iteration operator story requirements
- specialist-skill discovery and fallback routing
- Podman-first stack scaffolding
- ORDS-first application and data design
- premium Oracle Redwood / Oracle JET UI expectations
- first-iteration top-right `Use Your Own Data` dataset-admin expectations when demo data is replaceable
- LiveStack demo runbook guide scaffolding
- bundle validation for cross-file contract drift

## What This Package Includes

- `SKILL.md`: primary orchestration contract
- `SUPPORT.md`: public prerequisites, support matrix, and support boundaries
- `update.json`: canonical public GitHub zip-manifest update source and validation command
- `references/`: built-in fallback playbooks and guardrails
- `scripts/`: scaffolding, install-helper, validation, self-update, and deterministic release utilities
- `tests/`: package-level regression tests for the grading gate and release behavior
- `assets/bundled/oracle-db-skills/`: portable bundled Oracle database helper snapshot
- `assets/bundled/livestack-guide-builder/`: portable bundled LiveStack guide runbook helper snapshot
- `assets/bundled/redwood-creator/`: portable bundled Oracle JET / Redwood UI helper snapshot

## Installation

Install the directory into your Codex skills root as:

```text
$CODEX_HOME/skills/livestacks-orchestrator
```

If `CODEX_HOME` is not set, the default skills root is:

```text
~/.codex/skills/livestacks-orchestrator
```

No separate setup step is required for the three bundled companion skills. When needed, the orchestrator can install them into the same skills root with:

- `scripts/ensure_oracle_db_skill.py`
- `scripts/ensure_livestack_guide_builder.py`
- `scripts/ensure_redwood_creator.py`

Maintainers can refresh bundled helper snapshots from the currently installed live skills with:

- `python3 scripts/sync_oracle_db_bundle.py`
- `python3 scripts/sync_livestack_guide_builder_bundle.py`
- `python3 scripts/check_skill_package.py`
- `python3 -m unittest discover -s tests -p 'test_*.py'`

The expanded directory is the reviewable source of truth. After source checks pass, rebuild or verify the checked-in release ZIP and public manifest from this directory with:

```text
python3 scripts/build_release.py --archive ../livestacks-orchestrator.zip --manifest ../livestacks-orchestrator.update.json --publish
python3 scripts/build_release.py --archive ../livestacks-orchestrator.zip --manifest ../livestacks-orchestrator.update.json --check
```

Release builds use stable ordering, timestamps, and canonical archive modes. Publishing stages the ZIP and manifest beside their destinations and activates them as one recoverable pair, so a failed replacement restores the previous published pair instead of leaving mismatched artifacts.

On each substantial invocation, run:

- `python3 scripts/self_update.py --auto --json`

The updater checks the small public GitHub manifest at `skills/livestack/livestacks-orchestrator.update.json`, compares its `content_hash` to the installed skill, and downloads `livestacks-orchestrator.zip` only when the manifest says the package changed. It verifies the archive checksum, requires the extracted `VERSION` to match the manifest version, validates and prepares the extracted archive, then uses an ephemeral sibling rollback copy while swapping installations. Activation failures restore the prior installation; successful updates remove transaction artifacts, or report retained `recovery_backup` or `recovery_lock` paths as warnings when cleanup fails. If the manifest, archive, preparation, or validation is unavailable, the updater skips the update and leaves the current skill in place.

## Runtime Expectations

See [`SUPPORT.md`](./SUPPORT.md) for the public prerequisites and support matrix.

Minimum requirements for normal use:

- Codex skill runtime with local filesystem access
- `python3`

Required when generating or validating runnable LiveStacks bundles:

- `podman`
- `podman compose`

## 0.1.0-preview.21 Beta Bar

This preview is intended for guided internal beta use. The first generated application iteration is expected to be more than a scaffold:

- default LiveStacks start from a capability-led operator application core, then apply Oracle 26ai capability strategy, feature usage pattern, industry, pain-point, dynamic scene architecture, Oracle capability, data-contract, and guide-runbook overlays
- the bundled `assets/template-overlays/industry-overlays.json` corpus supplies reusable vocabulary and scene-shaping examples, not raw templates to copy
- generated bundles must record `input/template-provenance.json` and `docs/golden-core-overlays.md`
- generated default LiveStacks must keep `stack/compose.yml` and `stack/.env.example` aligned to the capability-led runtime baseline; industry, story, and capability variation belongs in app, database, seed/config, docs, guide, and provenance artifacts
- `$livestacks-orchestrator` runs must use multi-agent specialist execution by default; any local fallback requires an explicit ledger reason
- Oracle AI Database 26ai feature strategy is the first design decision; use `$oracle-db-skills` to choose the minimum credible Oracle-native capability set before shaping the UI
- sparse briefs default to an `operator_workbench` story unless the working PRD justifies a broader showcase
- generated app structure must include Command Center, Data Foundation, and a right-sized set of dynamic capability-backed workflow scenes rather than a fixed scene count
- generated scenes must satisfy the Scene Experience Contract: scene-specific components or page modules, distinct interaction patterns, scene-local state, visible domain objects, real Oracle evidence per scene, workflow handoffs, and screenshot captions that prove scenes are visually and behaviorally different
- repeated generic `scene-stage` shells with one shared primary action cannot receive A+, even when the shell has Oracle chrome and scene labels
- generated app chrome must follow the repeatable LiveStack shell pattern: Oracle logo/name lockup on the left, left-side scene navigation using known-rendering `oj-fwk-icon-*` glyphs, per-scene Oracle feature chips, top-right `Use Your Own Data`, and a right-side clickable/collapsible scene-aware `Oracle Internals` rail
- generated frontends must include a scene metadata manifest that drives navigation labels, guide/screenshot order, Oracle feature tags, primary CTAs, and Oracle Internals evidence payloads
- Oracle Internals must be a scene-owned technical exhibit: `What's Happening`, color-coded capability badges, real SQL or PL/SQL snippets, diagram/data-flow boxes, scene-specific security/governance callouts, live evidence or dynamic state, and AI provider/data-egress boundaries when relevant
- generated apps are treated as production-credible external applications by default, with protected destructive/admin routes, fail-closed dependency behavior, externalized secrets, CORS/HTTPS/token guidance, least-privilege boundaries, and meaningful readiness checks
- generated apps should include visible Oracle AI capability evidence unless the working PRD explicitly rejects AI; preferred AI modes are Oracle AI Vector Search, DBMS_VECTOR/DBMS_VECTOR_CHAIN, constrained Select AI / DBMS_CLOUD_AI, deterministic NL-to-SQL, and local Ollama-assisted flows with clear Oracle execution boundaries
- the opening screen must expose a real operator workflow with a primary action, decision point, and Oracle evidence surface
- Oracle Redwood / Oracle JET polish is part of the first-pass acceptance bar
- generated app chrome must use Oracle JET framework patterns, Redwood theme styling, JET typography/font variables backed by Oracle Sans, restrained Redwood geometry, documented Redwood colors, and known-rendering Oracle JET framework glyph classes through `redwood-creator` guidance
- generated app UI must not use `lucide-react` or any other non-JET icon library for navigation, buttons, titles, status, dataset actions, or Oracle Internals
- generated app UI must not use Tailwind
- replaceable-demo solutions must include top-right `Oracle Internals` and `Use Your Own Data` controls; Oracle Internals must be clickable/collapsible, scene-aware, and populated by the active scene, while Use Your Own Data must include template download, validate-only preview, upload or replace, restore-demo validation, active Oracle-backed dataset state, job status, and restore-demo execution behind an admin-token or equivalent authorization boundary; when the dataset overlay is open, Oracle Internals must switch to dataset-governance evidence instead of showing stale scene content
- direct app-to-database runtime access must be documented as a bootstrap, migration, readiness, or admin exception; normal application APIs stay ORDS-first
- generated `guide/` content must be a LiveStack demo runbook with desktop, sandbox, and tenancy workshop variants
- `validate_livestack_bundle.py` checks the story, UI, dataset, and Oracle evidence contract before a bundle is called production-ready
- generated bundles must record red/green test evidence in `validation/test-evidence.md`
- `grade_livestack_bundle.py` is the final gate; only `A+` with `Pass: yes` is acceptable

## Quick Start

1. Install this package under the Codex skills root.
2. Invoke `$livestacks-orchestrator` with either:
   - a full PRD
   - a partial PRD plus notes
   - a brief containing at least `industry` and `pain_point`
3. Let the orchestrator create:
   - `input/business-input.md`
   - `input/product-requirements.md`
   - `input/working-prd.md`
4. For generated solution bundles, run:
   - `python3 scripts/find_scaffold_markers.py <solution-root>`
   - `python3 scripts/validate_livestack_bundle.py <solution-root>`
   - `python3 scripts/grade_livestack_bundle.py <solution-root>`

## Output Contract

A production-ready LiveStacks run should converge on one solution package containing:

- problem framing
- proposed solution
- architecture decisions
- data design
- UI concept
- implementation plan
- risks and challenge review
- final package contents

The generated bundle should also include a Podman-first `stack/`, Oracle-first `database/`, and sibling `guide/` workshop deliverable.

## Public Release Status

This package now includes basic release metadata files:

- `README.md`
- `CHANGELOG.md`
- `VERSION`
- `NOTICE`
- `LICENSE`

Important:

- The current `LICENSE` is intentionally conservative and does not claim approved public redistribution terms yet.
- Bundled Oracle-branded assets and helper snapshots should be treated as release-managed content and reviewed before broad external distribution.

## Validation Scope

Before calling a generated LiveStacks bundle production-ready, the expected verification path is:

1. `python3 scripts/find_scaffold_markers.py <solution-root>`
2. `podman compose config` from `<solution-root>/stack`
3. `python3 scripts/validate_livestack_bundle.py <solution-root>` (defensively rechecks scaffold markers)
4. `python3 scripts/grade_livestack_bundle.py <solution-root>` (inherits all validator findings)
5. LiveLabs markdown validation for the generated `guide/`

Before sharing or embedding the skill package itself, run:

```text
python3 scripts/check_skill_package.py
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/build_release.py --archive ../livestacks-orchestrator.zip --manifest ../livestacks-orchestrator.update.json --check
```

Before substantial orchestration work, run:

```text
python3 scripts/self_update.py --auto --json
```

## Support Notes

- The orchestrator is designed to remain portable when companion skills are missing.
- Database, guide-authoring, and Redwood/JET UI guidance prefer installed helper skills first, then bundled install, then built-in fallback where applicable.
- Screenshot helpers are intentionally optional because browser and Node prerequisites vary by machine.
- Public support boundaries, prerequisites, and out-of-scope items are centralized in [`SUPPORT.md`](./SUPPORT.md).
