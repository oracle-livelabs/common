# Oracle Database Fallback

Use this bundled reference only after `python3 scripts/ensure_oracle_db_skill.py` could not make the bundled `oracle-db-skills` snapshot available. It is the minimum Oracle-first database playbook required for `livestacks-orchestrator` to remain portable and still produce a credible LiveStacks bundle.

This file does not replace the depth of `$oracle-db-skills`. When that sibling skill is available, prefer the targeted Oracle guides from that collection and use this file only as a compact baseline.

## Portable Fallback Contract

- Keep Oracle Database as the engine of the solution, not just persistence.
- Keep the runtime Oracle-first and ORDS-first:
  - `db`
  - `ords`
  - `app`
  - `ollama`
- Prefer this request path:

```text
app -> ORDS -> PL/SQL packages / curated SQL / views -> Oracle Database
```

- Use direct app-to-database access only for bootstrap, migrations, readiness, or tightly scoped operator-admin tasks that do not fit ORDS cleanly. Document the exception; normal business APIs remain ORDS-first.

## Database Specialist Fallback Workflow

When `$oracle-db-skills` is missing:

1. Load this file plus `references/architecture-guardrails.md`.
2. Treat `references/role-playbooks.md#database-specialist` as the output contract.
3. Produce an Oracle-first design anyway:
   - schema and seed strategy
   - package API seams
   - ORDS read and action routes
   - data onboarding contract
   - Oracle evidence surface

## Oracle Feature Routing

Map the pain point to Oracle capabilities before adding app logic.

- Transactional decisioning or operational scoring:
  - PL/SQL package APIs
  - curated ORDS modules
  - JSON payload capture where helpful
- Search and investigation:
  - Oracle Text for lexical retrieval
  - Oracle AI Vector Search for semantic retrieval
  - hybrid search when both are needed
- Matching, triage, recommendations, evidence retrieval, and RAG:
  - `VECTOR` columns
  - source/chunk metadata
  - HNSW or IVF vector indexes when data volume justifies ANN search
  - DBMS_VECTOR for embeddings and utility functions
  - DBMS_VECTOR_CHAIN for chunking, RAG pipelines, summarization, and generation where provider credentials are available
- Natural-language SQL, explanations, summaries, translations, chat, or agent flows:
  - Select AI / DBMS_CLOUD_AI only when the feature is explicitly useful
  - scoped `object_list`, preferably curated views over base tables
  - schema comments or annotations for better SQL generation
  - `SHOWSQL` or deterministic SQL templates before read-only execution
  - blocked DML, DDL, and PL/SQL unless a protected operator path explicitly requires them
- Relationship-heavy casework:
  - SQL Property Graph
- Background processing or refresh:
  - `DBMS_SCHEDULER`
  - materialized views
  - Advanced Queuing when the problem is event-driven
- Aggregated operational views:
  - curated SQL views
  - materialized views when refresh cost is justified

Do not force Oracle features for theater. Use the smallest Oracle set that honestly solves the pain point.

## Oracle AI Defaults

If `$oracle-db-skills` is unavailable, still require generated apps to be explicit about AI:

- `ai_capability_mode`: vector/RAG, DBMS_VECTOR/DBMS_VECTOR_CHAIN, Select AI / DBMS_CLOUD_AI, deterministic NL-to-SQL, local Ollama-assisted app logic, or documented no-AI decision.
- `provider_boundary`: local model, external provider credential, Select AI profile, vector credential, or no LLM.
- `data_egress_caveat`: metadata-only, retrieved chunks/results to provider, local-only, or none.

Oracle Internals or database X-Ray should surface those fields for every AI-enabled scene.

## Schema And Package Defaults

- Keep versioned SQL artifacts under source control.
- Use numbered schema files, for example:
  - `01_tables.sql`
  - `02_<domain>_engine_pkg.sql`
  - `03_predictive_assets.sql`
  - `04_seed_pkg.sql`
  - `05_dataset_admin_pkg.sql`
  - `06_read_api_pkg.sql`
  - `07_ords_modules.sql`
- Prefer one application schema for the demo path unless separation is clearly needed.
- Keep business logic in PL/SQL packages instead of duplicating it in the app layer.
- Prefer explicit package seams such as:
  - `<domain>_engine_pkg`
  - `<domain>_read_api_pkg`
  - `<domain>_seed_pkg`
  - `<domain>_dataset_admin_pkg`

## ORDS Defaults

- Prefer custom ORDS modules over AutoREST for non-trivial flows.
- Use stable split paths:
  - read: `/ords/<schema>/<domain>/read/v1/...`
  - action: `/ords/<schema>/<domain>/action/v1/...`
- Publish only curated routes that map to packages, views, or tightly bounded SQL.
- Keep ORDS definitions versioned in SQL, not hand-edited in the running instance.
- If an ORDS PL/SQL handler needs repeated request-body reads, bind `:body_text` once into a local CLOB and reuse that variable rather than referencing `:body_text` multiple times.

## Security Defaults

- Use least-privilege grants for the app schema and ORDS-exposed paths.
- Keep secrets externalized in `.env` or equivalent operator-managed config.
- Avoid hardcoding credentials or cloud-only dependencies.
- Keep the Oracle evidence surface safe:
  - show route names, package names, feature badges, traces, or generated SQL summaries
  - do not expose secrets, raw connection strings, or unsafe internal values

## Migrations, Seed, And Dataset Onboarding

- Keep demo seed logic separate from customer-data onboarding.
- Version migrations and seed logic explicitly.
- When customer data can replace demo data, include:
  - template download
  - validate-only preview
  - destructive upload
  - job ledger or status tracking
  - active dataset state
  - restore-demo
- Keep derived artifacts rebuildable after import, not bundled as opaque magic.

## Oracle Evidence Surface

Every LiveStacks app should visibly prove Oracle is doing the work.

At minimum, surface one of:

- Oracle Internals panel
- database X-Ray mode

Show real evidence such as:

- ORDS route names
- package or view names
- Oracle feature badges
- search mode used
- graph or vector capability used
- AI capability mode, embedding model, vector dimensions, distance metric, index type, top-k, source attribution, Select AI action/profile boundary, and data-egress posture when applicable
- request-flow traces for the current screen

## Validation Checklist

Before calling the database layer production-ready, confirm:

- schema SQL applies cleanly in order
- ORDS modules publish from versioned SQL
- `podman compose config` passes
- health endpoints report real Oracle and ORDS readiness
- dataset validate, upload, restore, and status flows are explicit
- the Oracle evidence surface reflects real routes and database work

## When To Escalate Beyond This Fallback

Use `$oracle-db-skills` when available for:

- detailed ORDS auth or hardening work
- performance tuning beyond basic design hygiene
- advanced security design such as VPD, TDE, or auditing strategy
- sophisticated migration patterns
- Oracle Text, vector, graph, scheduler, or AQ implementation details
