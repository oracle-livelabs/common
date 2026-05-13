# Role Playbooks

## Table Of Contents

- Status ledger
- Delegation rules
- Project Manager
- Solution Engineer
- Database Specialist
- UI/UX Developer
- Full Stack Developer
- Security / Platform Engineer
- Technical Writer / Documentation Lead
- Devil's Advocate

## Status Ledger

Keep a visible ledger throughout the run.

| Role | Status | Skill | Owner | Key outputs | Open issues |
| --- | --- | --- | --- | --- | --- |
| Project Manager | pending | built-in fallback or `create-plan` | local | plan, dependencies, convergence | |
| Solution Engineer | pending | built-in fallback or `notion-spec-to-implementation` | subagent | working PRD, requirements, personas, NFRs | |
| Database Specialist | pending | `$oracle-db-skills`, bundled install, or bundled fallback | subagent | schema, ORDS, packages, migrations | |
| UI/UX Developer | pending | bundled-install `$redwood-creator`, built-in fallback, or `frontend-web-app-designer` | subagent | journeys, screens, interactions | |
| Full Stack Developer | pending | built-in fallback or framework-specific implementation skill | subagent | app architecture, files, services | |
| Security / Platform Engineer | pending | built-in fallback or security/deploy sidecar skill | subagent | secrets, auth, network, portability | |
| Technical Writer / Documentation Lead | pending | `$livestack-guide-builder`, bundled install, or built-in runbook fallback | subagent | setup, guide, runbook, rebuild docs | |
| Devil's Advocate | pending | built-in fallback or review sidecar skill | subagent | objections, fragility review | |

Use statuses `pending`, `in_progress`, `completed`, `blocked`, or `revising`.

## Shared Build Contract

Before the opening role wave starts:

- persist the raw source input in `input/business-input.md`
- persist the source PRD or explicit no-PRD record in `input/product-requirements.md`
- synthesize `input/working-prd.md`

All specialist roles should treat `input/working-prd.md` as the execution contract for the run.

Rules:

- Do not delegate straight from a raw brief.
- Do not let roles maintain competing private requirement sets.
- If scope changes later, update `input/working-prd.md` first and then propagate the change outward.

## Delegation Rules

- If the user invokes or mentions `$livestacks-orchestrator`, treat that as the request for delegated specialist work unless the user explicitly asks for no delegation.
- Subagents are the required default for independent specialist roles when the runtime and session policy allow it. Do not silently keep all roles local for convenience.
- Start the opening delegated wave only after `input/working-prd.md`, the role ledger, and the skill-discovery pass exist. The default opening wave is Solution Engineer, Database Specialist, UI/UX Developer, Full Stack Developer, Security / Platform Engineer, and Technical Writer / Documentation Lead.
- Keep ownership disjoint when delegating. The Project Manager owns convergence and final arbitration in the main thread unless there is a strong reason to delegate PM artifacts separately.
- Fall back to local execution only when subagents are unavailable, when the role is too tightly coupled to split safely, or when the user explicitly asks for no delegation. Record the exception reason in the ledger `Open issues` column.
- Whether local or delegated, explicitly record the skill used for each role or mark it as `orchestrator fallback`.

## Project Manager

Prefer installed skills:

- `create-plan` only when the user explicitly asks for a plan

Built-in fallback:

- `references/project-manager-execution.md`

Own:

- workflow sequencing
- milestone tracking
- dependency management
- arbitration between specialists
- final convergence

Produce:

- a work plan
- a pre-delegation readiness note confirming that `input/working-prd.md` is stable enough for the role wave
- the role ledger
- a dependency list
- a convergence note naming the chosen implementation

Primary artifacts:

- `docs/implementation-plan.md`
- `docs/architecture-decisions.md`
- `validation/launch-checklist.md`

Rule:

- If `create-plan` is used, treat it as a planning helper for this role only. Continue through architecture, implementation, security, and documentation work afterward.

Done when:

- every required role contributed or has a reasoned `not needed`
- unresolved issues are surfaced clearly
- one implementation is chosen and weak alternatives are rejected

## Solution Engineer

Prefer installed skills:

- `notion-spec-to-implementation` only when the user already provides a Notion spec or PRD
- otherwise use the built-in fallback for this role

Built-in fallback:

- `references/solution-engineering-execution.md`

Own:

- pre-delegation working-PRD synthesis when the user provides only a brief or partial PRD
- problem framing
- personas
- business outcomes
- use cases
- non-functional requirements
- acceptance criteria

Produce:

- a working PRD or an updated working PRD that freezes the current build contract
- primary and secondary personas
- feature inventory aligned to the MVP scope
- core user journeys
- measurable business outcomes or proxy KPIs
- non-functional requirements for security, performance, portability, and operability
- acceptance criteria grounded in the business pain point
- operator dataset-onboarding journey and acceptance criteria when customer data replacement is part of the solution
- acceptance criteria for the Oracle Internals or database X-Ray experience when the app needs to prove Oracle is the engine

Primary artifacts:

- `input/working-prd.md`
- `docs/problem-framing.md`
- `docs/proposed-solution.md`
- `docs/feature-inventory.md`

Done when:

- the solution is clearly Oracle-first, not app-first
- the personas and outcomes explain why each major feature exists
- brief-only inputs have been converted into a working PRD before delegation
- acceptance criteria can drive build validation later

## Database Specialist

Prefer installed skills:

- always `oracle-db-skills` if it is available

If `oracle-db-skills` is unavailable:

- first run `python3 scripts/ensure_oracle_db_skill.py` to install the bundled snapshot into the local skills root
- rerun skill discovery and prefer the installed bundled snapshot if that succeeds
- load `references/oracle-database-fallback.md`
- load `references/architecture-guardrails.md`
- keep the role in `orchestrator fallback` mode, but still produce a concrete Oracle-first schema, package, ORDS, migration, and onboarding design

Load only the relevant Oracle guides for the solution, such as:

- `../ords/ords-rest-api-design.md`
- `../ords/ords-security.md`
- `../ords/ords-authentication.md`
- `../plsql/plsql-package-design.md`
- `../devops/schema-migrations.md`
- `../security/privilege-management.md`
- `../security/row-level-security.md`
- `../security/encryption.md`
- `../security/auditing.md`
- `../appdev/json-in-oracle.md`
- `../appdev/oracle-text.md`
- `../appdev/sql-property-graph.md`
- `../features/vector-search.md`
- `../features/dbms-vector.md`
- `../features/select-ai.md`
- `../features/ai-profiles.md`
- `../agent/nl-to-sql-patterns.md`
- `../agent/intent-disambiguation.md`
- `../agent/safe-dml-patterns.md`
- `../agent/destructive-op-guards.md`
- `../features/advanced-queuing.md`
- `../features/materialized-views.md`
- `../architecture/inmemory-column-store.md`

Own:

- schema and data model
- ingestion and replication patterns
- PL/SQL package APIs
- ORDS modules, templates, and handlers
- Oracle feature inference and selection
- feature-to-scene mapping with the UI/UX role
- performance, security, and migration design

Produce:

- logical and physical data model
- schema boundaries and privileged accounts
- Oracle feature candidates inferred from the pain point when the brief does not name them explicitly
- Oracle AI capability mode, including vector/RAG, DBMS_VECTOR/DBMS_VECTOR_CHAIN, Select AI / DBMS_CLOUD_AI, deterministic NL-to-SQL, local Ollama, or a documented AI rejection
- provider boundary and data-egress caveat for each chosen AI flow
- Oracle capability-to-business mapping for the required database features
- chosen Oracle feature set plus rejected features with reasons
- ORDS resource plan
- package API seams for business logic
- migration and seed strategy
- customer data onboarding approach, including importable versus regenerated artifacts and active dataset state when relevant
- the Oracle evidence map for the app: which ORDS routes, packages, SQL, or feature outputs should surface in the Oracle Internals or X-Ray experience
- feature-to-scene mapping showing where each chosen capability becomes visible in the application journey
- safe NL-to-SQL rules when natural-language questions are in scope: scoped views, read-only SELECT, `SHOWSQL` or deterministic templates before execution, ambiguous-prompt clarification, and blocked DML/DDL/PLSQL unless explicitly protected

Done when:

- Oracle Database is clearly the engine solving the pain point
- ORDS or package APIs separate the app from direct table access
- the design uses Oracle features instead of app-side reinvention
- no chosen Oracle feature is left without a visible scene, operator workflow, or evidence surface
- no chosen AI feature is left without UI evidence that names the package, route, model/profile boundary, source attribution, and data-egress behavior
- migrations, seed data, and customer data replacement are versioned and explicit

## UI/UX Developer

Prefer installed skills:

- `redwood-creator`
- `frontend-web-app-designer`
- `figma` or `figma-implement-design` when the user supplies Figma artifacts

If `redwood-creator` is unavailable:

- first run `python3 scripts/ensure_redwood_creator.py` to install the bundled snapshot into the local skills root
- rerun skill discovery and prefer the installed bundled snapshot if that succeeds
- keep the role in `orchestrator fallback` mode only if that install path is unavailable or fails, but still enforce the Oracle JET / Redwood app contract

Own:

- user journeys
- story mode and scene sequencing
- first-screen interaction quality
- information architecture
- page and screen inventory
- interaction patterns
- demo credibility and production extensibility

Produce:

- screen map
- story mode with a recommended `scene_count_target`
- `primary_user_loop`, `first_scene_goal`, `first_interaction`, `first_decision_point`, and `first_oracle_evidence`
- primary CTA path and guided next-step behavior
- scene sequence with one-sentence purpose per scene
- Oracle JET / Redwood component map, including Oracle JET framework components, Redwood theme usage, JET typography/font variables backed by Oracle Sans, documented Redwood colors, Oracle JET glyphs for app controls/sidebar/titles, and shell/layout rules
- navigation model
- feature-to-scene mapping co-authored with the database role so the story shape matches the chosen Oracle capabilities
- operator-only dataset admin journey when demo data must be replaceable, using a persistent top-right masthead `Upload Your Own Data` utility that opens an overlay dataset manager unless the user explicitly requests another pattern
- Oracle Internals panel or database X-Ray journey for the key screens
- interaction notes for critical paths
- loading, error, and empty-state coverage
- visual credibility notes for customer-facing use

Done when:

- the UI is plausible for both internal demos and customer rebuilds
- the UI reflects the business pain point rather than generic dashboards
- the UI has a visible story structure and primary CTA path instead of only a static dashboard or nav shell
- the first screen has a meaningful operator action, state change, and Oracle evidence update
- app surfaces follow Oracle JET / Redwood guidance rather than generic web-system output, control icons use Oracle JET glyph/icon classes, typography uses JET font variables backed by Oracle Sans, and control icons do not use Redwood marketing pictograms or Tailwind-style utility systems
- the UI looks polished and premium enough for an Oracle customer walkthrough in the first iteration
- replaceable demo-data solutions include a credible top-right `Upload Your Own Data` masthead utility plus dataset upload/admin and restore experience
- key screens have a credible Oracle Internals or database X-Ray presentation, not just a generic “powered by Oracle” statement
- key states are covered, not just the happy path

## Full Stack Developer

Prefer installed skills:

- `aspnet-core` only when the target implementation is explicitly ASP.NET
- `chatgpt-apps` only when the user is building a ChatGPT App
- otherwise use the built-in fallback for this role

Built-in fallback:

- `references/full-stack-delivery.md`

Own:

- application architecture
- service boundaries
- backend and frontend responsibilities
- Oracle JET / Redwood implementation alignment for the frontend path, including Redwood theme import, JET typography/font variables, Oracle Sans, JET glyphs, and no Tailwind
- story-mode-aware scaffolding that consumes `story_mode` and `scene_count_target`
- dataset onboarding workflow when customer data replacement is in scope
- Oracle evidence plumbing for the app
- Oracle AI evidence plumbing for vector/RAG, DBMS_VECTOR/DBMS_VECTOR_CHAIN, Select AI / DBMS_CLOUD_AI, deterministic NL-to-SQL, or local Ollama-assisted flows when chosen
- external-facing production behavior: real readiness checks, protected destructive routes, fail-closed dependency behavior, and no mock-backed business runtime
- environment configuration
- container structure
- runnable scaffolding

Produce:

- app architecture and runtime choice
- file tree
- `compose.yml`
- `Containerfile`
- working PRD traceability into the generated file and folder structure
- story-mode-aware application shell with a primary CTA path
- backend and frontend contracts, including the Oracle JET / Redwood frontend contract when the app has a UI
- dataset import, validate, restore, and job-status contract when relevant
- Oracle Internals or database X-Ray contract, including how scene-level evidence is surfaced
- AI evidence contract naming embedding model, vector dimensions, distance metric, index type, top-k/source attribution, Select AI profile/action, generated SQL review mode, provider boundary, or data-egress caveat as relevant
- environment variable guidance
- runnable scaffolding where feasible

Primary artifacts:

- `stack/compose.yml`
- `stack/Containerfile`
- `stack/.env.example`
- `docs/ui-concept.md`
- `docs/deployment-guide.md`
- `docs/customer-rebuild.md`

Done when:

- the bundle is portable across environments
- the app consumes ORDS-mediated APIs
- the app UI path is Oracle JET / Redwood aligned when the solution includes a frontend, and it does not include Tailwind
- the generated shell follows the chosen story mode instead of falling back to a generic placeholder dashboard
- configuration is externalized and secret-free in source control
- replaceable demo-data solutions include a dataset admin flow with template download, validate-only preview, upload, progress status, active dataset state, and demo restore
- the app exposes an Oracle Internals panel or database X-Ray mode backed by real routes, SQL, packages, or runtime evidence
- destructive/admin routes are protected and the app fails closed when Oracle, ORDS, or selected AI/model dependencies are unavailable
- the code and file structure support a credible implementation path

## Security / Platform Engineer

Prefer installed skills:

- `security-best-practices`
- `security-threat-model` when a formal abuse-path pass is needed
- a deployment-specific skill such as `cloudflare-deploy`, `render-deploy`, `vercel-deploy`, or `netlify-deploy` only when the user explicitly names that target

Own:

- secrets handling
- authentication and authorization
- operator-only control for destructive dataset operations
- external-facing readiness for customer demo use
- network boundaries
- container hardening
- portability constraints
- deployment guidance

Produce:

- secret and configuration policy
- auth and least-privilege plan
- admin-only control policy for dataset onboarding or replacement paths
- network boundary notes
- deployment portability notes
- health, observability, and recovery expectations
- fail-closed behavior for Oracle, ORDS, AI provider, vector credential, and local model failures
- data-egress disclosure for Select AI, RAG, external model calls, and local Ollama-only flows

Done when:

- no hardcoded secrets remain
- least privilege is explicit across DB, ORDS, and app tiers
- destructive dataset replacement paths are restricted, documented, and justified
- HTTPS, CORS, and token handling are documented when relevant
- `/healthz` reflects real dependency readiness instead of a static process heartbeat
- AI provider credentials, vector credentials, Select AI profiles, and local model endpoints are externalized and redacted from UI/logs
- Oracle Internals exposes safe evidence without leaking secrets, connection strings, raw credentials, or unapproved result/chunk data
- the solution can credibly run in an enterprise environment

## Technical Writer / Documentation Lead

Prefer installed skills:

- `livestack-guide-builder`
- `playwright` or `webapp-testing` as optional screenshot-capture helpers when the guide needs real app images and those skills are already installed
- `internal-comms` or `outbound-content-rules` only when the requested document style matches those skills
- otherwise use the built-in fallback for this role

Fallback:

- first run `python3 scripts/ensure_livestack_guide_builder.py` to install the bundled snapshot into the local skills root
- rerun skill discovery and prefer the installed bundled snapshot if that succeeds
- if `livestack-guide-builder` is still unavailable, use the local runbook rules in `$livestacks-orchestrator` rather than blocking the guide deliverable
- treat `playwright` or `webapp-testing` as optional helpers, not auto-installed defaults, because browser or Node prerequisites vary by machine

Own:

- setup documentation
- LiveStack demo runbook and workshop authoring
- screenshot inventory and image integration for the guide
- preserving the canonical `guide/workshops/*/index.html` shell files untouched
- architecture documentation
- data onboarding documentation
- deployment guidance
- operational runbook
- limitations documentation

Produce:

- setup guide
- `guide/` workshop tree as a LiveStack demo runbook
- workshop manifests for desktop, sandbox, and tenancy variants
- documentation that stays aligned to the current working PRD rather than drifting back to older raw notes
- screenshot inventory under `output/guide-screenshots/`
- screenshot-backed scene or operator-flow labs aligned to the running app, including what is happening, what to interact with, what changes, and the expected outcome or business signal
- architecture overview
- deployment guide
- customer rebuild guide
- dataset admin and operator workflow guide when customer data replacement is in scope
- Oracle Internals or database X-Ray usage notes when the application includes that surface
- runbook
- limitations and known risks

Done when:

- a builder can recreate the package without hidden prerequisites
- the guide reflects the real application scenes and local run flow as a demo runbook
- every scene lab tells the user what to do, what should change, and what business signal or outcome to notice
- the guide validator passes cleanly
- the canonical `guide/workshops/*/index.html` shell files were left untouched
- screenshots were captured from the running app and integrated into the guide where they add instructional value
- customer rebuild steps are explicit
- dataset template, validation, upload, and restore steps are documented when relevant
- operations and support expectations are documented

## Devil's Advocate

Prefer installed skills:

- none by default
- optionally use `security-threat-model` as a sidecar on security-heavy solutions

Built-in fallback:

- `references/devils-advocate-review.md`

Own:

- challenge weak assumptions in `input/working-prd.md`
- identify where the working PRD, bundle, and guide have drifted apart
- pressure-test whether Oracle AI Database 26ai remains indispensable in the final solution
- challenge weak architecture choices
- identify portability and security gaps
- expose hidden complexity
- force revisions before sign-off

Produce:

- an objection list
- fragility and maintainability risks
- portability gaps
- required revisions

Primary artifacts:

- `docs/risks-and-review.md`
- `docs/architecture-decisions.md`
- `validation/acceptance-checklist.md`

Done when:

- weak assumptions have been challenged, not just noted
- demo-only shortcuts are surfaced
- ORDS bypasses, hidden lock-in, or operational gaps are explicitly called out
