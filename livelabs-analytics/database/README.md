# LiveLabs Analytics ADB Alpha Package

Status: alpha design and rehearsal package.

This folder contains the Oracle Autonomous Database model for LiveLabs Analytics. The files are intentionally alpha-versioned until the model is rehearsed against an ADB target, validated with current source data, and approved for the Object Storage frontend path.

Do not describe these scripts as migrated, live, or production-ready yet.

## Contents

- `migrations/alpha/`: ordered alpha SQL scripts and gated templates.
- `docs/alpha-versioning.md`: how alpha versions graduate later.
- `docs/adb-alpha-model.md`: model summary from a DBA/engineer perspective.
- `docs/manual-and-wms-ingestion-alpha.md`: manual-change, overwrite, and WMS integration model.
- `docs/object-storage-export-contract-alpha.md`: JSON snapshot contract for the static frontend.
- `tests/validate_alpha_package.py`: local static validation for this package.

## Apply Order

1. `A001__alpha_security_roles.sql`
2. `A002__alpha_control_lineage.sql`
3. `A003__alpha_stage_tables.sql`
4. `A004__alpha_curated_model.sql`
5. `A005__alpha_export_contract.sql`
6. `A006__alpha_optional_ords_read_surface.template.sql`, only after ORDS/read-only API approval
7. `A007__alpha_vector_search_gate.template.sql`, only after vector provider/model/dimension/text-egress approval
8. `A008__alpha_ingestion_integration_control.sql`
9. `A009__alpha_runtime_grants.sql`
10. `A010__alpha_search_and_performance_indexes.sql`
11. `A011__alpha_quality_validation_views.sql`
12. `A012__alpha_load_control_api.sql`

## Current Boundaries

- ADB is intended to become authoritative for loaded analytics data.
- Object Storage should serve static files and generated JSON snapshots only.
- ORDS is optional and must be read-only if used.
- Static admin credentials are not valid security. The current static admin route is blocked in the frontend bundle until a real auth path exists.
- Embeddings remain blocked until explicit approval.
- Manual updates are staged as reviewed change requests and merged into curated tables; Object Storage remains read-only.
- WMS integration is tracked through source systems, integration runs, and watermarks before curated overwrite/update logic runs.

## Local Validation

Run from the `livelabs-analytics` root:

```powershell
python database\tests\validate_alpha_package.py
node scripts\validate-dashboard.mjs
```

When a local server is running on a non-default port:

```powershell
$env:DASHBOARD_URL='http://127.0.0.1:4177'
node scripts\validate-dashboard.mjs
```
