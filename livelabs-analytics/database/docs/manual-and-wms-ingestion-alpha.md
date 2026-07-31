# Manual And WMS Ingestion Alpha

Status: alpha design.

This package now assumes new data can arrive in two ways:

- approved manual corrections loaded by a DBA, ETL runner, or future authenticated admin service;
- WMS integration runs, first as full snapshots and later as deltas when WMS exposes a stable feed.

The static frontend on Object Storage must not write directly to ADB. Manual changes should enter through `CODEX_STAGE.MANUAL_CHANGE_REQUEST` or `CODEX_STAGE.PKG_ALPHA_LOAD_CONTROL.SUBMIT_MANUAL_CHANGE` after a real authenticated channel exists.

## Source Control Tables

- `CODEX_STAGE.SOURCE_SYSTEM` defines known sources such as `MANUAL_ADMIN`, `WMS_SANDBOX_REPORT`, `WMS_ALL_WORKSHOPS`, and `DASHBOARD_VIEWS`.
- `CODEX_STAGE.SOURCE_PRIORITY_RULE` defines deterministic precedence and overwrite policy by target entity.
- `CODEX_STAGE.INTEGRATION_RUN` records each manual upload, WMS scheduled run, WMS on-demand run, backfill, or validation run.
- `CODEX_STAGE.INTEGRATION_WATERMARK` records the last successful WMS watermark, cursor, batch, and run.
- `CODEX_STAGE.MANUAL_CHANGE_REQUEST` stores reviewed JSON patches with natural keys and dedupe hashes.

## Curated Merge And Overwrite Rules

Curated loads should use `MERGE`, not delete-and-reinsert. The intended pattern is:

1. Start a `LOAD_BATCH`.
2. Register an `INTEGRATION_RUN`.
3. Load files into `DATASET_FILE` and typed `STG_*` tables.
4. Resolve natural keys into `DIM_CONTENT_ITEM`.
5. Apply only approved/manual or authoritative WMS changes based on `SOURCE_PRIORITY_RULE`.
6. Record every insert, update, no-change, rejected row, or superseded row in `CODEX_ANALYTICS.CURATED_MERGE_ACTION`.
7. Record before/after JSON and hashes in `CODEX_ANALYTICS.CONTENT_CHANGE_HISTORY` when curated data changes.
8. Keep open rejects and merge conflicts out of Object Storage export promotion.

Manual corrections default to `REVIEW_REQUIRED`; once approved, they can use `MANUAL_WINS`. WMS metadata uses `NEWER_SNAPSHOT_WINS` so later WMS snapshots update the current curated state without destroying prior history.

## WMS Integration Readiness

For the first WMS integration, use `FULL_SNAPSHOT` mode and store the WMS file/object URI and source hash in `DATASET_FILE`. After a successful run, call `ADVANCE_WATERMARK` with the last WMS timestamp, export ID, ETag, or cursor that WMS provides.

When WMS supports deltas, use `DELTA` mode and require these checks before merge:

- batch has exactly one active `INTEGRATION_RUN` per WMS source;
- source watermark is greater than the stored watermark;
- file hash has not already been loaded for the same source family;
- row counts reconcile across source, stage, curated merge actions, and rejects;
- open merge conflicts are reviewed before export.

## DBA Review Views

- `V_LOAD_BATCH_RECONCILIATION`: source, stage, curated, reject, and conflict counts by batch.
- `V_MANUAL_CHANGE_QUEUE`: pending and failed manual changes.
- `V_WMS_INTEGRATION_STATUS`: WMS source status and latest watermark.
- `V_MERGE_CONFLICT_QUEUE`: open or rejected overwrite conflicts.
- `V_IDENTITY_DUPLICATE_LIVELABS_ID`: duplicate current LiveLabs IDs.
- `V_IDENTITY_WMS_FAMILY_REVIEW`: WMS family rows that need family-level review.
- `V_REPLACEMENT_SAME_FAMILY_REVIEW`: replacement candidates that violate the same-family rule.

## Export Gate

The Object Storage export should be generated only after:

- `V_LOAD_BATCH_RECONCILIATION.open_rejects = 0`;
- `V_LOAD_BATCH_RECONCILIATION.open_merge_conflicts = 0`;
- manual changes for the export batch are `APPLIED`, `REJECTED`, or `SUPERSEDED`;
- WMS watermark and source object metadata are recorded for WMS-backed batches;
- export object checksums and row counts validate.

