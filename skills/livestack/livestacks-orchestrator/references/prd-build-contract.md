# PRD Build Contract

Use this reference whenever the input is a full PRD, a partial PRD plus notes, or only a brief that needs to become a working PRD before delegation.

## Source Of Truth

Always persist three input artifacts before the specialist wave begins:

- `input/business-input.md`: raw user brief, notes, copied workshop text, or workbook-style source material
- `input/product-requirements.md`: the source PRD when provided, or an explicit record that no source PRD was provided
- `input/working-prd.md`: the compact execution contract for the role wave and bundle build

The specialist wave should treat `input/working-prd.md` as the build contract. Do not delegate directly from the raw brief.

## Input Modes

### `PRD`

Use when the user provides a full PRD.

- Preserve the source PRD in `input/product-requirements.md`.
- Synthesize `input/working-prd.md` as a compact execution-oriented version of that PRD.
- Keep unresolved items under `## Open Questions`.
- Do not duplicate the full PRD verbatim across every downstream doc.

### `Merge`

Use when the user provides a partial PRD plus additional notes, links, or workshop material.

- Preserve the source PRD material in `input/product-requirements.md`.
- Merge the PRD plus notes into one coherent `input/working-prd.md`.
- Mark every inferred or reconciled item as `Assumption:` until confirmed.

### `Bootstrap`

Use when the user provides only a brief.

- Preserve the raw brief in `input/business-input.md`.
- Record in `input/product-requirements.md` that no source PRD was provided for this run.
- Synthesize a compact `input/working-prd.md` before any specialist delegation starts.
- Keep the working PRD narrow: enough to align the role wave, not a heavyweight corporate PRD.

## Working PRD Rules

The working PRD should be:

- compact
- execution-oriented
- explicitly scoped
- traceable to source input
- safe for delegation

Rules:

- Preserve the user's business wording where possible.
- Mark inferred content as `Assumption:`.
- Keep open issues in `## Open Questions`, not hidden inside requirements prose.
- If the user later supplies a better PRD, update `input/working-prd.md` first, then propagate the changes to the bundle and guide.
- Keep one working PRD per solution root. Do not let roles diverge into private requirement variants.
- When the brief does not name Oracle features explicitly, infer candidate Oracle-native capabilities from the pain point and workflow, then record both the chosen and rejected feature options in the working PRD.
- When the brief does not name AI features explicitly, infer a credible Oracle AI Database mode. Prefer Oracle AI Vector Search or DBMS_VECTOR/DBMS_VECTOR_CHAIN for semantic matching, triage, recommendations, evidence retrieval, and RAG; use Select AI / DBMS_CLOUD_AI only for explicit NL-to-SQL, explain SQL, summarize, translate, chat, or agent workflows.
- Record `ai_capability_mode`, `provider_boundary`, and `data_egress_caveat` for every generated app. If AI is intentionally out of scope, record the rejection and why the app still proves Oracle Database value without it.
- Derive story mode and scene count from the workflow shape plus inferred Oracle feature breadth before UI and application scaffolding begins.
- Default sparse briefs to an `operator_workbench` first iteration unless the workflow and Oracle feature breadth justify `converged_showcase` or `hybrid`.
- Define the first app iteration as a real operator workflow with a primary action, state change, Oracle evidence, and dataset-admin entry rather than a static welcome page or generic dashboard.
- Treat polished Redwood/JET UI and JET iconography from `$redwood-creator` as first-iteration acceptance criteria.
- Treat `Upload Your Own Data` as a first-iteration requirement whenever demo data is replaceable.
- Record explicitly whether the run is allowed to be a prototype. Unless the user explicitly requested a prototype or mock, the working PRD should assume a production-ready runtime with real ORDS-backed flows, no mock business-data fallback, and automated database bootstrap in the normal startup path.
- Record explicitly that the default target is an external-facing production application. Include fail-closed dependency behavior, protected destructive/admin operations, token/auth boundaries, CORS/HTTPS posture, and real readiness checks in the acceptance criteria.

## Required Working PRD Sections

Use this minimum section set in `input/working-prd.md`:

```markdown
# Working PRD

## Input Mode

## Source Inputs

## Program Context

## Business Scenario

## Business Outcomes

## Personas

## Pain-Point Classification

## Core Workflow

## Story Architecture

## First Iteration Experience

## Oracle AI Database 26ai Protagonist Story

## AI Capability Mode

## Provider Boundary And Data Egress

## Oracle Feature Candidates

## Recommended Oracle Feature Set

## Rejected Features And Why

## Oracle Capability Mapping

## MVP Scope

## Non-Goals

## Feature Inventory

## Feature-To-Scene Mapping

## Data Contract

## Deployment And Runtime Assumptions

## Security And Trust Boundaries

## Redwood JET UI Quality Bar

## Non-Functional Requirements

## Acceptance Criteria

## Success Metrics

## Assumptions

## Open Questions
```

## Section Guidance

- `## Input Mode`: `PRD`, `Merge`, or `Bootstrap`
- `## Source Inputs`: identify which files, briefs, or PRDs were used
- `## Program Context`: why this LiveStack exists and what conversion goal it serves
- `## Business Scenario`: industry, pain point, business outcome, KPI framing
- `## Personas`: primary evaluator, builder, operator, and any admin persona that matters
- `## Pain-Point Classification`: classify the solution as an operator workbench, converged showcase, hybrid flow, or another justified story mode candidate
- `## Core Workflow`: the smallest end-to-end flow that proves value
- `## Story Architecture`: define `story_mode`, `scene_count_target`, `primary_user_loop`, `scene_sequence`, `oracle_protagonist_beats`, `primary_cta_path`, and `dataset_role`
- `## First Iteration Experience`: define `first_scene_goal`, `first_interaction`, `first_decision_point`, `first_oracle_evidence`, and `upload_your_own_data`
- `## Oracle AI Database 26ai Protagonist Story`: explain why Oracle is indispensable, not a generic backend
- `## AI Capability Mode`: name the chosen AI pattern such as vector/RAG, DBMS_VECTOR/DBMS_VECTOR_CHAIN, Select AI / DBMS_CLOUD_AI, deterministic NL-to-SQL, or local Ollama-assisted application logic
- `## Provider Boundary And Data Egress`: state whether the scene uses local Ollama, external AI provider credentials, Select AI profiles, vector credentials, or no LLM, and what data leaves Oracle, if any
- `## Oracle Feature Candidates`: list the Oracle-native capabilities considered, especially when the source brief did not name them explicitly
- `## Recommended Oracle Feature Set`: keep the chosen feature set minimal, credible, and grounded in the workflow
- `## Rejected Features And Why`: record tempting but unnecessary Oracle features so later roles do not quietly reintroduce them
- `## Oracle Capability Mapping`: map business needs to specific Oracle capabilities
- `## MVP Scope`: what the first production-ready bundle must include
- `## Non-Goals`: what this run will explicitly not solve
- `## Feature Inventory`: user-visible, operator, and Oracle-evidence features
- `## Feature-To-Scene Mapping`: map each chosen Oracle feature to at least one visible scene or operator flow and its evidence surface
- `## Data Contract`: required entities, optional fields, derived artifacts, validation behavior
- `## Deployment And Runtime Assumptions`: default runtime topology, optional services, environment boundaries
- `## Security And Trust Boundaries`: roles, identities, admin-only paths, known demo-only exceptions
- `## Redwood JET UI Quality Bar`: define `redwood_jet_ui_quality_bar`, Oracle JET framework/theme usage, JET typography/font variables backed by Oracle Sans, Redwood color usage, JET glyph/icon use for app chrome, geometry constraints, contrast expectations, Tailwind exclusion, and prohibited app-UI patterns
- `## Acceptance Criteria`: business, technical, guide, and rebuild outcomes that must pass
- `## Success Metrics`: measurable validation targets or proxy metrics
- `## Assumptions`: inferred decisions that still need confirmation
- `## Open Questions`: remaining unresolved items that should not be silently guessed

## Delegation Handoff

Before the role wave starts, ensure `input/working-prd.md` is good enough that each role can answer:

- what problem is being solved
- who the primary personas are
- how the pain point should shape the story mode
- what the golden-path workflow is
- what the first screen asks the operator to do and which state changes prove the app is interactive
- why Oracle AI Database 26ai is the protagonist
- which AI capability mode is in scope, which provider boundary applies, and what data-egress caveat the UI should surface
- which Oracle capabilities are in scope and which were rejected
- how those chosen capabilities map to scenes, CTAs, and Oracle evidence
- what data onboarding pattern is expected
- how `Upload Your Own Data` is surfaced and wired when demo data is replaceable
- what the premium Redwood/JET quality bar is for the first iteration
- what runtime topology is expected
- whether prototype-only mock behavior is explicitly allowed or forbidden
- what the current acceptance bar is

If those answers are not yet stable, refine the working PRD before delegating.
