---
name: oracle-db-skills
description: Oracle Database reference library covering SQL, PL/SQL, performance, security, ORDS, SQLcl, AI and vector features, containers, frameworks, and agent workflows. Load only the relevant guides on demand.
version: 1.0.0
repository: https://github.com/krisrice/oracle-db-skills
---

# Oracle DB Skills

A curated Oracle Database reference library packaged as a standalone skill. It includes the newer agent, container, framework, AI/vector, and language-driver guides alongside the core SQL, PL/SQL, administration, monitoring, performance, migration, ORDS, and SQLcl material.

## How to Use

1. **Find the right category** using the routing table below.
2. **Read only the specific guide files** relevant to the task.
3. **Use the bundled snapshot paths** under `skills/`.
4. **Apply the guidance** to answer questions, generate code, review changes, or plan Oracle work.

## Category Routing

| User asks about… | Read from |
|------------------|-----------|
| Backup, recovery, RMAN, redo and undo logs, user management | `skills/admin/` |
| Agent-safe Oracle workflows, NL-to-SQL safety, ORA error recovery, schema discovery, client tracing | `skills/agent/` |
| Drivers, pooling, JSON, XML, spatial, Oracle Text, property graph, transactions | `skills/appdev/` |
| RAC, CDB/PDB, Exadata, In-Memory, OCI, Data Guard architecture | `skills/architecture/` |
| Oracle container images, Free and Enterprise databases, ORDS, SQLcl, operator, RAC, Instant Client | `skills/containers/` |
| ERD, data modeling, partitioning, tablespaces | `skills/design/` |
| Liquibase, Flyway, online operations, EBR, testing, version control | `skills/devops/` |
| AQ, Scheduler, MVs, DBLinks, APEX, vector search, DBMS_VECTOR, Select AI, AI profiles | `skills/features/` |
| Framework and ORM integration such as SQLAlchemy, Django, Spring Data JPA, TypeORM, Dapper, GORM | `skills/frameworks/` |
| Migrating from PostgreSQL, MySQL, SQL Server, MongoDB, Snowflake, Teradata, and others | `skills/migrations/` |
| Alert log, ADR, health checks, space, top SQL | `skills/monitoring/` |
| ORDS, REST APIs, OAuth2, AutoREST, file transfer, PL/SQL gateway, monitoring | `skills/ords/` |
| AWR, ASH, explain plan, indexes, optimizer stats, wait events, memory | `skills/performance/` |
| Package design, collections, cursors, compiler options, debugging, patterns, performance, security | `skills/plsql/` |
| Privileges, VPD, TDE, encryption, auditing, network security, data masking | `skills/security/` |
| SQL patterns, CTEs, dynamic SQL, SQL injection avoidance, SQL and PL/SQL best practices | `skills/sql-dev/` |
| SQLcl basics, scripting, formatting, data loading, Liquibase, MCP server, CI/CD | `skills/sqlcl/` |

## Installed Directory Layout

```
admin/         Database administration
agent/         Agent and NL-to-SQL safety patterns
appdev/        Drivers and application-development topics
architecture/  Infrastructure and deployment architecture
containers/    Oracle and adjacent container images and runtimes
design/        Schema design and data modeling
devops/        CI/CD and deployment operations
features/      Oracle database features, including AI/vector topics
frameworks/    ORM and framework integrations
migrations/    Migration guides to Oracle
monitoring/    Diagnostics and operational monitoring
ords/          Oracle REST Data Services
performance/   SQL and database tuning
plsql/         PL/SQL development
security/      Oracle security
sql-dev/       SQL development patterns
sqlcl/         SQLcl
```

## Key Starting Points

- **`skills/sqlcl/sqlcl-mcp-server.md`** — connecting AI assistants to Oracle through the SQLcl MCP server
- **`skills/features/vector-search.md`** — Oracle vector data type, indexes, and similarity search
- **`skills/agent/nl-to-sql-patterns.md`** — safe Oracle-oriented NL-to-SQL patterns for agents
- **`skills/migrations/migration-assessment.md`** — best first read for Oracle migration work
- **`skills/performance/explain-plan.md`** — base reference for SQL performance analysis
- **`skills/plsql/plsql-package-design.md`** — base reference for PL/SQL architecture work
- **`skills/containers/free.md`** — Oracle Database Free container guidance
- **`skills/frameworks/sqlalchemy-oracle.md`** — a representative ORM integration entry point
