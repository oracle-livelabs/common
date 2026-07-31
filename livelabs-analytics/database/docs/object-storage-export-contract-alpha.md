# Object Storage Export Contract Alpha

Status: alpha contract.

The frontend should read generated JSON snapshots from Object Storage. It should not hold ADB wallet files, `.env` files, backend credentials, API secrets, local datasets, or admin passwords.

## Required Files

Root payloads:

- `dashboard_payload.json`
- `dashboard_tables.json`
- `wms_canonical.json`
- `workshop_updates.json`
- `replacement_similarity.json`

Data payloads:

- `data/portfolio_inventory.json`
- `data/full_content_search_index.json`
- ranked and governance files under `data/`

Control payload:

- `manifest.json`

## Manifest Fields

The generated `manifest.json` should include:

- `contract_version`
- `release_channel`
- `batch_id`
- `export_batch_id`
- `generated_at`
- `source_snapshot_date`
- `source_systems`
- `integration_watermarks`
- `manual_override_count`
- `merge_conflict_count`
- `open_reject_count`
- `object_count`
- `objects[]`
- `validation_status`

Each object entry should include:

- `object_key`
- `content_type`
- `row_count`
- `byte_size`
- `checksum_sha256`
- `generated_at`

## Promotion Pattern

Use release folders first:

```text
releases/<alpha-export-batch-id>/...
```

Promote the current pointer only after validation:

```text
current/manifest.json
current/dashboard_payload.json
current/data/portfolio_inventory.json
```

The static frontend should keep relative URLs so the same bundle works locally and in Object Storage.

## Export Readiness Gate

The export job should only move files under `current/` after the backing batch has:

- no open load rejects;
- no open merge conflicts;
- no pending approved-but-unapplied manual changes;
- WMS watermark metadata recorded when the source includes WMS;
- checksum and row-count validation for every generated object.
