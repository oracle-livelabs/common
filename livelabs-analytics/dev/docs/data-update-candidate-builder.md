# Build a private Analytics data candidate

`build-data-update-candidate.py` converts collected WMS, LiveLabs, and GitHub exports into a reviewable candidate. It never replaces `inventory/data/portfolio_inventory.json`, builds public outputs, or applies Jenkins scores. Write each run to a new ignored folder under `.private/admin/data-update-candidates/`.

## Inputs

- WMS Kitchen Sink XLSX: proposed full record source.
- WMS Primary XLSX: comparison against shared fields; do not append it to Kitchen Sink.
- WMS All Workshops XLSX: published-report-route scope reference.
- LiveLabs `collected_views.csv`: normalized rows from the six selected periods. Preserve the separate raw JSON captures and comparison report.
- GitHub item-history JSONL, summary CSV, repository file index, commit-file-events CSV, search-candidates CSV, and collection manifest. Search candidates are hashed and counted, never treated as approved mappings.
- Historical Jenkins report JSON. It remains a private report reference; a matching detailed findings file and fresh QA execution are required before score merge.
- Current full inventory as the baseline for dated retention of older type, publish-type, and tag data.

## Example

Run from the project root. Supply the selected weekly source files, actual WMS and Views source dates, the WMS retrieval note, and a unique output directory; do not reuse an earlier run folder. The source dates and note have no defaults, so a later run cannot silently inherit an older collection's provenance.

```powershell
python -X utf8 dev/scripts/build-data-update-candidate.py `
  --wms-kitchen "<weekly-folder>\Kitchen_sink_All_Workshops_&_Sprints.xlsx" `
  --wms-primary "<weekly-folder>\Primary_report_All_Workshops_&_Sprints.xlsx" `
  --wms-published "<weekly-folder>\All Workshops Report.xlsx" `
  --views-csv "<weekly-folder>\collected_views.csv" `
  --github-jsonl "<weekly-folder>\github-item-history.jsonl" `
  --github-summary "<weekly-folder>\github-item-summary.csv" `
  --github-files "<weekly-folder>\github-repository-files.csv" `
  --github-events "<weekly-folder>\github-commit-file-events.csv" `
  --github-search-candidates "<weekly-folder>\github-search-candidates.csv" `
  --github-collection-manifest "<weekly-folder>\collection-manifest.json" `
  --jenkins-report "<weekly-folder>\latest_jenkins_report.json" `
  --wms-snapshot-date "<YYYY-MM-DD>" `
  --wms-retrieval-note "<actual retrieval date/time and timezone, or known limitation>" `
  --views-capture-date "<YYYY-MM-DD>" `
  --baseline inventory\data\portfolio_inventory.json `
  --output ".private\admin\data-update-candidates\<unique-run-id>"
```

The output contains the candidate `portfolio_inventory.json`, input paths and SHA-256 hashes in `source-manifest.json`, and a source reconciliation in `review-summary.json` and `review-report.md`.

## Join and provenance rules

- Join dashboard views and GitHub history to Analytics records by exact LiveLabs ID. Keep view-only IDs, current WMS IDs without views, unresolved GitHub mappings, and title mismatches visible in the review.
- For WMS rows without a LiveLabs ID, retain prior classifications only when WMS ID plus normalized title identifies exactly one prior row and exactly one current row. Keep all source rows. Use `Unknown` for content type when there is no safe prior classification; never default to Workshop.
- Current WMS does not supply content type, publish type, or the tag exports. Retained values carry the prior inventory date; absent values remain unknown.
- The candidate represents all Kitchen Sink fields: core fields remain in Analytics columns, while WMS-only fields (support tier, paid/green-button flags and URLs, OCI/noVNC flags, and last-update person) remain in private record details. Review privacy and field purpose before exposing any of these details.
- Keep GitHub paths, commit authors/dates, subjects, and changed files in `githubHistory`. Do not overwrite WMS last-update dates or ranking freshness from Git history. Review file changes before calling them substantive.
- Require JSONL and detailed CSV file events to reconcile. Preserve CSV rows without changed-file paths under `unresolved_event_rows`; do not display them as file changes.
- Keep Jenkins findings separate from candidate scores unless there is a compatible same-run detailed export and a current execution.
- Leave the candidate private. The full inventory includes internal contact fields; do not copy it into public release files.

## Review before promotion

1. Compare the candidate record count and field values with all WMS reports. Investigate the Published-route versus Publish Status difference.
2. Review views per-period joins, period boundaries, capture timestamps, title mismatches, and the known Last Week discrepancy.
3. Resolve Unknown content/publish types and missing current tags, or obtain approval for the explicit unknown/retention policy.
4. Review GitHub source status, resolved manifest verification at the recorded repository head, blank file-event rows, and any candidate path before using history.
5. Treat the current Jenkins file as historical display evidence only. Do not apply its scores.
6. Run the project checks against a candidate-specific validation path. Only after approval, backup, privacy review, and release validation may the canonical inventory or public projection be updated.

`PRIVATE_CANDIDATE_NOT_PROMOTED` is the only status this tool emits. A successfully written candidate is not a release approval.
