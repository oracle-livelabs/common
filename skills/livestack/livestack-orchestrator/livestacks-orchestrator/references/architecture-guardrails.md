# Architecture Guardrails

## Table Of Contents

- Core invariants
- Baseline stack
- ORDS-first API pattern
- Oracle feature selection
- Security and portability guardrails
- Oracle DB guide routing

## Core Invariants

- Make Oracle Database the engine of the solution, not a passive persistence layer.
- Keep AI close to the data by preferring Oracle-native retrieval, search, package APIs, and curated ORDS resources.
- Solve the business pain point with Oracle features first, then build the application around those capabilities.
- Produce one portable, secure bundle that a customer can rebuild with their own data.
- Treat the generated application as external-facing by default. The app must be credible for an Oracle customer walkthrough with protected destructive actions, real readiness checks, fail-closed dependency behavior, and no mock-backed business runtime unless the user explicitly asks for a prototype.

## Baseline Stack

Treat these services as the default baseline:

- `db`: Oracle AI Database Free
- `ords`: Oracle REST Data Services
- `app`: customer-facing application container
- `ollama`: local LLM runtime

Treat model bootstrap as a required host-side capability rather than a compose service:

- publish the Ollama API on `11434:11434`
- generate operator-friendly wrappers for both POSIX `sh` and PowerShell
- pull and warm `llama3.2` and `gemma:2b` unless the model plan changes
- document how operators rerun bootstrap safely after first start or model changes

Optional services are acceptable only when justified by the pain point, for example:

- `goldengate`: change data capture and replication
- scheduler or worker containers for background jobs
- supporting integration adapters

## ORDS-First API Pattern

Prefer this path:

```text
app -> ORDS -> PL/SQL packages / curated SQL / views -> Oracle Database
```

Rules:

- Prefer custom ORDS modules for production APIs over table-level AutoREST when business logic is non-trivial.
- Prefer PL/SQL package APIs for transactional logic, validation, and security boundaries.
- Keep ORDS definitions and SQL artifacts under version control.
- Allow direct app-to-database access only for bootstrap, migrations, readiness checks, or tightly justified admin tasks. Document every exception in `docs/architecture-decisions.md` or `docs/data-design.md`; normal business APIs must still route through ORDS.
- Operator-only dataset onboarding flows may use app-owned admin endpoints when they orchestrate validate/upload/restore jobs that do not map cleanly to ORDS. Keep the exception narrow, document it, and persist dataset state in Oracle.
- The application should expose an Oracle evidence surface, either a shared Oracle Internals panel or a dedicated database X-Ray mode, that makes the ORDS -> package or SQL -> Oracle path legible to the user for key screens.

## Oracle Feature Selection

Map the pain point to Oracle capabilities before adding app logic.

- Event consolidation or process visibility:
  - JSON, materialized views, Advanced Queuing, DBMS_SCHEDULER, GoldenGate when CDC is required
- Search, recommendations, or guided remediation:
  - JSON, Oracle Text, property graph, package APIs, curated ORDS handlers
- Relationship-heavy workflows:
  - SQL property graph
- Concurrency, scale, or throughput pain:
  - connection pooling, locking strategy, In-Memory Column Store where justified
- Operational intelligence:
  - materialized views, scheduled refresh, package APIs, audit trails
- Semantic matching, recommendations, triage, evidence retrieval, or guided remediation:
  - Oracle AI Vector Search, `VECTOR` columns, HNSW or IVF vector indexes, source/chunk metadata, DBMS_VECTOR, DBMS_VECTOR_CHAIN, and ORDS/PLSQL-backed top-k retrieval
- Natural-language data questions, explanation, summarization, translation, or provider-backed chat:
  - Select AI / DBMS_CLOUD_AI with scoped `object_list`, preferably curated views over base tables, schema comments or annotations, deterministic temperature, `SHOWSQL` review for SQL generation, and read-only execution by default
- Local demo assistance without external provider data egress:
  - Ollama-backed app logic may assist summaries or explanations, but Oracle remains the system of record and Oracle Internals must show where local model output stops and database execution begins

If an Oracle feature is not actually required, do not force it in just for theater.

## Oracle AI Production Rules

- Prefer vector/RAG as the default visible AI feature for search, matching, triage, recommendation, evidence, investigation, and knowledge-assist flows.
- Store source attribution alongside chunks and embeddings. The UI and Oracle Internals should be able to show source, chunk id, top-k, distance metric, embedding model, vector dimension, index type, and whether retrieval used ANN or exact search.
- Keep Select AI constrained. Use it when its specific actions matter, such as `showsql`, `explainsql`, `narrate`, `chat`, `summarize`, `translate`, or agent workflows.
- Do not expose arbitrary `runsql` as a first-iteration operator capability. Safer defaults are deterministic SQL templates or `SHOWSQL` review, followed by read-only SELECT execution through curated ORDS routes.
- Surface data-egress posture in Oracle Internals: metadata-only, retrieved chunks/results to provider, local Ollama only, or no LLM. Redact profile names, credential names, and secrets unless they are safe demo labels.
- If hardened deployment requires it, document where an administrator would restrict provider data access, including the DBMS_CLOUD_AI data-access controls described by `$oracle-db-skills`.

## Security And Portability Guardrails

- Keep the stack runnable with compose-compatible engines across local, on-prem, and cloud VM environments.
- Make the default compose contract pass cleanly under Podman on Oracle Linux 9: keep fixed published ports in `compose.yml`, declare top-level `networks.default`, and give each service an explicit `hostname` plus matching aliases.
- Externalize secrets and environment-specific values.
- Keep published ports as compose-only settings for the default four-service contract. Do not introduce `APP_PORT`, `DB_PORT`, `ORDS_PORT`, or `OLLAMA_PORT` in `.env` or `.env.example`.
- Do not hardcode cloud-specific managed dependencies unless the bundle documents a portable replacement path.
- Use versioned migrations for schema changes and keep demo seed data separate from customer onboarding flows.
- When demo data is intended to be replaced, include a documented operator-only dataset administration path and make the split between importable source data and regenerated derived artifacts explicit.
- Keep local-model bootstrap cross-platform. Do not require a one-shot warmup container when portable host wrappers can do the same job with lower overhead.
- Use the canonical ORDS config bind mount `./ords-config:/etc/ords/config:Z,U` so SELinux labeling stays compatible with Podman hosts such as Oracle Linux 9.
- Keep Oracle evidence views useful but safe: show generated SQL, package names, ORDS handlers, feature badges, or request-flow traces when helpful, but do not leak secrets, raw credentials, or unsafe internal-only values.
- Document health checks, observability, and operational expectations.
- Keep ORDS, database privileges, and app identities on least-privilege boundaries.
- Protect destructive operations such as dataset replacement, restore-demo, reseed, scenario replay, and any generated AI action with explicit operator intent and an admin-only route or token boundary. The default contract is `ADMIN_TOKEN` supplied by environment and checked through `Authorization: Bearer <ADMIN_TOKEN>`; an equivalent auth/CSRF/JWT boundary is acceptable when documented.
- Document CORS, HTTPS, browser-token, and reverse-proxy assumptions for customer-facing rebuilds. Local demo defaults may be lightweight, but production guidance must not leave unsafe open writes as the expected posture.
- Make `/healthz` a readiness signal for the real dependency graph where feasible: app process, ORDS route reachability, Oracle bootstrap state, and selected model/provider readiness. Do not call a static heartbeat production-ready.

## Oracle DB Guide Routing

When `oracle-db-skills` is installed in the same parent skills directory, load only the relevant sibling guides below.

If that sibling skill is missing, first run `python3 scripts/ensure_oracle_db_skill.py` to install the bundled `oracle-db-skills` snapshot into the local skills root.

If that bundled install path is unavailable or fails, do not block the run. Use `references/oracle-database-fallback.md` as the bundled minimum Oracle design playbook, then continue with the Oracle-first and ORDS-first rules in this file.

| Need | Guide |
| --- | --- |
| ORDS module and handler design | `../ords/ords-rest-api-design.md` |
| ORDS hardening and CORS | `../ords/ords-security.md` |
| ORDS auth model | `../ords/ords-authentication.md` |
| PL/SQL package architecture | `../plsql/plsql-package-design.md` |
| Versioned schema changes | `../devops/schema-migrations.md` |
| JSON modeling | `../appdev/json-in-oracle.md` |
| Full-text search | `../appdev/oracle-text.md` |
| AI Vector Search, VECTOR columns, ANN indexes, and hybrid SQL+vector retrieval | `../features/vector-search.md` |
| DBMS_VECTOR and DBMS_VECTOR_CHAIN chunking, embeddings, RAG, and generation | `../features/dbms-vector.md` |
| Select AI, DBMS_CLOUD_AI, SQL generation, narrate, summarize, translate, and agent actions | `../features/select-ai.md` |
| AI profiles, vector credentials, and provider boundary setup | `../features/ai-profiles.md` |
| Safe natural-language-to-SQL mapping and ambiguity handling | `../agent/nl-to-sql-patterns.md` |
| Intent disambiguation and destructive-operation guardrails | `../agent/intent-disambiguation.md`, `../agent/safe-dml-patterns.md`, `../agent/destructive-op-guards.md` |
| Relationship-centric graph patterns | `../appdev/sql-property-graph.md` |
| Background jobs | `../features/dbms-scheduler.md` |
| Queue-driven flows | `../features/advanced-queuing.md` |
| Read-optimized views | `../features/materialized-views.md` |
| Least privilege | `../security/privilege-management.md` |
| Row filtering | `../security/row-level-security.md` |
| Encryption and data protection | `../security/encryption.md` |
| Auditability | `../security/auditing.md` |
| In-memory acceleration | `../architecture/inmemory-column-store.md` |

There is no bundled GoldenGate guide in `oracle-db-skills`. If GoldenGate is needed, treat it as an optional service with its own documented assumptions, operational boundaries, and fallback plan.
