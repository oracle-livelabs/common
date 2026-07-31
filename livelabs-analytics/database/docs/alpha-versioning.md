# ADB Alpha Versioning

The ADB package uses alpha versions until live deployment evidence exists.

## Version Labels

- File names use `A###__alpha_<name>.sql`.
- Gated files use `A###__alpha_<name>.template.sql`.
- Database change rows use `release_channel = 'ALPHA'`.
- Allowed change states are alpha states only:
  - `ALPHA_DRAFT`
  - `ALPHA_APPLIED`
  - `ALPHA_VALIDATED`
  - `ALPHA_FAILED`
  - `ALPHA_SUPERSEDED`

## Promotion Rule

Do not rename alpha scripts or statuses to migrated/live wording until all of these are true:

- the target ADB connection is verified with a read-only preflight;
- alpha scripts are rehearsed in a noncritical target;
- current dashboard exports and WMS workbook are available;
- a full load reconciles source, stage, curated, and export counts;
- manual-change and WMS-integration queues have no unresolved conflicts for the export batch;
- WMS watermark or equivalent source checkpoint is recorded when WMS data is used;
- Object Storage JSON snapshots pass static validation;
- browser smoke passes from the Object Storage-style static bundle;
- owner approval is recorded.

## Naming Discipline

Until promotion evidence exists:

- use `alpha`, `rehearsal`, `candidate`, `review`, or `validated locally`;
- do not use final live-state labels in migration metadata;
- do not claim the historical May batch as current state.
