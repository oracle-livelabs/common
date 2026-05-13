# Solution Engineering Execution

Use this built-in fallback when no installed requirements or spec skill is a strong match for the current LiveStacks run. This role is responsible for turning raw input into a buildable contract before delegation.

## Own

- `input/working-prd.md` synthesis or refinement
- problem framing
- pain-point classification
- personas and business outcomes
- story-mode selection
- first-iteration user-story quality
- Oracle capability inference when the brief is underspecified
- Oracle AI capability mode, provider boundary, and data-egress posture
- `Upload Your Own Data` acceptance criteria when demo data is replaceable
- Redwood/JET UI acceptance criteria
- MVP scope and feature inventory
- non-functional requirements
- acceptance criteria

## Required Artifacts

- `input/working-prd.md`
- `docs/problem-framing.md`
- `docs/proposed-solution.md`
- `docs/feature-inventory.md`

## Workflow

1. Normalize raw input with `references/input-normalization.md`.
2. Preserve the source trail in `input/business-input.md` and `input/product-requirements.md`.
3. Freeze the current execution contract in `input/working-prd.md` before role delegation.
4. If the brief is vague about Oracle capabilities, use `$oracle-db-skills` to infer the minimum credible Oracle-native feature candidates from the workflow and operator needs. Prefer Oracle AI Vector Search or DBMS_VECTOR/DBMS_VECTOR_CHAIN for matching, triage, recommendations, evidence retrieval, and RAG; use Select AI / DBMS_CLOUD_AI only for explicit NL-to-SQL, explain, summarize, translate, chat, or agent needs.
5. Narrow those candidates to the chosen feature set and explicitly record rejected Oracle features that are not necessary for this solution.
6. Default sparse briefs to `operator_workbench`; choose `converged_showcase` or `hybrid` only when the workflow and Oracle feature breadth justify it.
7. Define `scene_count_target`, `primary_user_loop`, `primary_cta_path`, `first_scene_goal`, `first_interaction`, `first_decision_point`, and `first_oracle_evidence`.
8. Tie every major feature to a persona, business outcome, and Oracle-first reason for existence.
9. Define `ai_capability_mode`, `provider_boundary`, and `data_egress_caveat` for every AI-enabled app, or explicitly record why AI is rejected for the run.
10. Define `upload_your_own_data` as a first-iteration requirement whenever demo data is replaceable.
11. Define the `redwood_jet_ui_quality_bar` for the app: premium Redwood/JET polish, Oracle JET framework/theme usage, JET typography/font variables backed by Oracle Sans, documented Redwood colors, JET glyph iconography, restrained geometry, top-right masthead controls, no marketing pictograms in app controls, and no Tailwind.
12. Add non-functional requirements for portability, external-facing production readiness, security, operations, performance, and accessibility.
13. Write acceptance criteria that can later drive bundle validation.

## Minimum Outputs

`input/working-prd.md` should make these explicit:

- business scenario
- business outcomes
- personas
- pain-point classification
- core workflow
- story architecture with `story_mode`, `scene_count_target`, `primary_user_loop`, and `primary_cta_path`
- first-iteration experience with `first_scene_goal`, `first_interaction`, `first_decision_point`, and `first_oracle_evidence`
- `Upload Your Own Data` dataset-admin acceptance criteria when demo data is replaceable
- Redwood/JET UI quality bar, including JET iconography expectations
- Oracle protagonist story
- AI capability mode, provider boundary, and data-egress caveat
- Oracle feature candidates, chosen feature set, and rejected features
- Oracle capability mapping
- MVP scope and non-goals
- feature inventory
- feature-to-scene mapping
- data contract
- deployment assumptions
- security boundaries
- non-functional requirements
- acceptance criteria

`docs/problem-framing.md` should explain:

- the pain point
- who is affected
- why the problem matters now
- scope boundaries

## Failure Modes To Prevent

- delegating from raw notes instead of a stable working PRD
- defaulting to a generic dashboard because the brief is sparse
- opening on a static welcome page instead of an interactive operator workflow
- adding features with no tied persona or outcome
- choosing Oracle features that have no visible scene, CTA, or evidence path
- making AI claims without concrete Oracle feature selection, provider boundary, or data-egress posture
- describing Oracle features without a business reason
- skipping acceptance criteria for dataset replacement or Oracle Internals evidence when those are in scope
- treating Redwood/JET polish or `Upload Your Own Data` as a later add-on
