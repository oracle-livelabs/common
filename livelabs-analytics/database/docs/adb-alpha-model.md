# LiveLabs Analytics ADB Alpha Model

Status: alpha design.

## Target Shape

The model keeps the useful May prototype shape, then hardens it for repeatable ADB administration:

- `CODEX_DEPLOY`: alpha change log.
- `CODEX_STAGE`: source batches, source files, typed staging rows, rejects.
- `CODEX_ANALYTICS`: curated dimensions, facts, search documents, export metadata, and read views.
- `CODEX_APP`: optional ORDS surface with read-only access.
- `CODEX_AI`: reserved for gated vector and AI work.

## Core Principles

- Keep ADB authoritative for curated analytics data.
- Keep Object Storage static: HTML, assets, and generated JSON snapshots.
- Use JSON snapshot export first; add ORDS only when live reads are required.
- Keep source lineage attached to every file, row, fact, and export.
- Keep `wms_id` and `livelabs_id` distinct.
- Prepare for both approved manual changes and WMS integration updates.
- Overwrite curated data through controlled merges, not delete-and-reinsert loads.
- Keep embeddings empty until provider/model/dimension/text-egress approval exists.

## Identity

- `livelabs_id`: preferred unique LiveLabs content item identity when present.
- `wms_id`: shared workshop-family identifier.
- `workshop_id`: source-specific legacy identifier.
- `identity_key`: stable generated fallback for rows where source IDs are incomplete.

Replacement recommendations must not compare content from the same `wms_id` family.

## Main Facts

- `FACT_WORKSHOP_SNAPSHOT`: current WMS/sandbox portfolio state by snapshot date.
- `FACT_DEMAND_METRIC`: dashboard time-window views and ranks.
- `FACT_REPO_EVIDENCE`: workshop-path update evidence, separate from repo-level fallback.
- `FACT_REPLACEMENT_CANDIDATE`: scored successor candidates and score components.
- `FACT_GOVERNANCE_DECISION`: lifecycle state, suggested action, score, and rule version.
- `FACT_VIEW_OUTLIER` and `FACT_VIEW_STAT`: dashboard distribution/outlier support.

## Manual And WMS Integration

- `SOURCE_SYSTEM`: approved source registry and source category.
- `SOURCE_PRIORITY_RULE`: deterministic overwrite policy by target entity.
- `INTEGRATION_RUN`: each manual upload, WMS scheduled run, WMS on-demand run, backfill, or validation run.
- `INTEGRATION_WATERMARK`: last successful WMS cursor, timestamp, object ETag, or export identifier.
- `MANUAL_CHANGE_REQUEST`: reviewed JSON patches for approved manual corrections.
- `CURATED_MERGE_ACTION`: every curated insert, update, no-change, reject, supersede, or conflict.
- `CONTENT_CHANGE_HISTORY`: before/after JSON payloads and hashes for overwrite audit.

Manual corrections are not browser-side static admin writes. They need an approved authenticated path before they can feed ADB.

## Overwrite And Update Policy

WMS metadata uses `NEWER_SNAPSHOT_WINS` so later WMS snapshots update current curated state while preserving previous change history. Approved manual changes can use `MANUAL_WINS`; unresolved source conflicts remain in the merge conflict queue and should block Object Storage export promotion.

## DBA Hardening

- Versioned alpha changes, not ad hoc loader DDL.
- Locked owner schemas and role-based read/write access.
- Foreign keys and check constraints for lineage and domain integrity.
- Export metadata so Object Storage promotion is atomic and auditable.
- WMS/manual source tracking, watermarks, and merge audit for repeatable updates.
- Oracle Text index for approved search documents and targeted reporting indexes.
- DBA review views for reconciliation, identity quality, manual queues, WMS status, and merge conflicts.
- Optional ORDS module stays `NOT_PUBLISHED` until reviewed.
- Vector search stays a gated template until approval.
