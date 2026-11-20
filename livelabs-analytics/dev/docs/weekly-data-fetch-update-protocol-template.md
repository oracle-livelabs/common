# Weekly Analytics Data Fetch and Update Protocol

**Status:** Template for Lucian's source-specific instructions. Do not treat blank fields as approved collection steps.

**Schedule:** Monday, 10:00 Europe/Bucharest, through the existing browser-based automation.

**Purpose:** Collect source data through Lucian's authenticated Edge session, validate it, prepare a reviewable Analytics candidate, and publish only after review and approval.

## Operating rules

1. Use only the source pages, accounts and export paths Lucian documents. Do not guess URLs, click paths, filters, report meanings or export options.
2. Do not save passwords, cookies, session URLs, access tokens or other sign-in secrets in this protocol, automation prompt, manifest or run report.
3. Never claim a source is current because it was downloaded recently. Record the source's own run/snapshot date separately from the download time.
4. Keep raw downloads unchanged. Normalize copies in a new run folder; preserve prior runs and active data for comparison and rollback.
5. If a source is unavailable, authentication expires, a required export is missing, or completeness cannot be shown, mark the run `PARTIAL` or `NEEDS_SIGN_IN`. Do not fill gaps with guesses or silently reuse old data as current.
6. Keep unmatched and ambiguous identities visible. Do not spread Jenkins findings across records based only on shared titles or a WMS family ID.
7. Collection, candidate preparation, review, integration and Object Storage publication are separate states. A successful download is not a successful Analytics update.
8. Do not alter source-system records, start Jenkins jobs, apply a merge, promote active inventory or publish to Object Storage without the required explicit approval gate below.

## Run record

Complete this section at the start of each scheduled run.

| Field | Run value |
|---|---|
| Run ID | `<unique ID>` |
| Run date and time | `<YYYY-MM-DD HH:mm Europe/Bucharest>` |
| Operator / automation | `<name>` |
| Workspace / project revision | `<path and commit or revision>` |
| Edge session available | `<yes/no; do not record session URL>` |
| Run status | `IN_PROGRESS / NEEDS_SIGN_IN / PARTIAL / NEEDS_REVIEW / READY_FOR_REVIEW / APPROVED / APPLIED / PUBLISHED` |
| Run folder | `<private run folder>` |
| Previous active snapshot | `<snapshot date, ID and location>` |

## Source collection cards

Fill in one card for every required export. Add another card if one source has multiple exports. Lucian's source instructions should specify each blank before the first complete run.

### Source card — WMS inventory and classifications

| Field | Instruction / captured value |
|---|---|
| Source/report name | `<exact name>` |
| Starting page and navigation steps | `<Lucian to provide exact steps>` |
| Filters, date range, status and type selections | `<exact settings; include public/private, enabled/disabled, removal requests as applicable>` |
| Export control and format | `<exact control and format>` |
| Required columns | `<column list from inspected export>` |
| Expected coverage | `<all required records; explain pagination and zero-row behavior>` |
| Source snapshot/as-of date | `<date shown by WMS>` |
| Download time | `<timestamp and timezone>` |
| Saved raw filename | `<filename>` |
| Exported row count / pages | `<counts>` |
| Completeness evidence | `<final page/total, export summary or other visible evidence>` |
| Validation notes | `<IDs, duplicates, missing columns, counts>` |
| Status | `NOT_STARTED / COLLECTED / BLOCKED / INVALID` |

**Current expected source inputs:** WMS inventory and Sprint classification. Confirm whether the classification is a separate export or a field in the inventory report; do not infer it.

**Additional contacts:** after reviewing WMS exports, rebuild the private contact
index against the active public inventory by LiveLabs ID. Use
`.private/admin/views-contacts.json` for the service and record matched/missing
counts. Verify owner and additional-contact email searches in all dashboard tabs
and Views. Follow [private contact deployment](../admin/TENANCY-DEPLOYMENT.md#additional-wms-contacts);
never add the supplemental index to public assets or a static release.

### Source card — LiveLabs dashboard demand

| Field | Instruction / captured value |
|---|---|
| Dashboard/report name | `<exact name>` |
| Starting page and navigation steps | `<Lucian to provide exact steps>` |
| Content types and filters | `<Workshop, Sprint, other; exact settings>` |
| Periods to capture | `<exact dashboard periods and labels>` |
| Export control and format | `<exact control and format; if no export, approved browser capture method>` |
| Identity fields available | `<stable IDs and displayed title fields>` |
| Period start/end and timezone | `<source values, or mark UNCONFIRMED>` |
| Rolling / calendar / cumulative definition | `<source definition, or mark UNCONFIRMED>` |
| Saved raw filename(s) | `<filename(s)>` |
| Row count per period / pages | `<counts>` |
| Completeness evidence | `<export totals and pagination evidence>` |
| Validation notes | `<unmatched/shared titles, duplicates, missing IDs>` |
| Status | `NOT_STARTED / COLLECTED / BLOCKED / INVALID` |

Do not infer period definitions from labels or collection time. Do not divide shared-title demand among multiple items. Keep title-only matches provisional.

### Source card — tags and metadata exports

Use one card per required dimension: product, role, focus and sales play, unless Lucian's instructions confirm a different source structure.

| Field | Instruction / captured value |
|---|---|
| Tag report/dimension | `<product / role / focus / sales play / other>` |
| Starting page and navigation steps | `<Lucian to provide exact steps>` |
| Filters and export format | `<exact settings>` |
| Identity and tag fields | `<columns>` |
| Source date / download time | `<timestamps and timezone>` |
| Saved raw filename | `<filename>` |
| Row count / completeness evidence | `<counts and pagination>` |
| Validation notes | `<unmapped IDs, duplicate or conflicting assignments>` |
| Status | `NOT_STARTED / COLLECTED / BLOCKED / INVALID` |

### Source card — Jenkins CI/CD QA report

| Field | Instruction / captured value |
|---|---|
| Source service and report name | `<exact service/report>` |
| Starting page and navigation steps | `<Lucian to provide exact steps>` |
| Run/build identifier and status | `<exact source values>` |
| Run start/completion time | `<timestamp and timezone>` |
| Export format(s) | `<full JSON; matching HTML or findings table when available>` |
| Required identity and finding fields | `<IDs, check results, priorities, locations, evidence and run metadata>` |
| Saved raw filename(s) | `<filename(s)>` |
| Counts | `<catalog entries, checks, findings, occurrences, grouped IDs>` |
| Completeness evidence | `<completed run, report totals, matching JSON/HTML run identity>` |
| Validation notes | `<grouped IDs, missing IDs, duplicate findings, absent locations>` |
| Status | `NOT_STARTED / COLLECTED / BLOCKED / INVALID` |

Use only a completed report whose run identity and totals reconcile. Preserve finding details and exact locations. Do not submit or rerun a Jenkins job as part of collection. If the report service is down, record it as blocked and retain historical QA as historical; do not present it as this week's run.

## Controlled processing sequence

### 1. Confirm access and create the run folder

- Confirm the desktop, Codex automation and Edge connection are available.
- Discover the current WMS, LiveLabs and Jenkins tabs; use only documented entry pages and the user's existing sign-in session.
- If sign-in, MFA, authorization or a permission prompt blocks access, stop the blocked collection and record the exact handoff required. Do not store authentication material.
- Create a new private run folder under `.private/admin/weekly-refresh/` using the run's Bucharest date/time. Keep raw files under `sources/` and record hashes in the manifest.

**Gate:** No source collection begins until the run record and folder exist.

### 2. Fetch each source and prove completeness

- Follow the completed source card step by step.
- Save the unmodified source file(s); record source date, retrieval timestamp, selected filters, export format, page/row totals and SHA-256.
- Verify all pages and expected record classes are included. Distinguish a valid zero-row result from a failed or incomplete export.
- Record each source independently as `COLLECTED`, `BLOCKED` or `INVALID`.

**Gate:** A required source with unknown totals or incomplete pagination makes the run `PARTIAL`; do not build a complete candidate.

### 3. Reconcile source schemas and identities

- Inspect actual headers, types, encodings, dates and IDs before creating normalized inputs.
- Compare required identifiers against the current Analytics inventory: LiveLabs ID is the content identity; WMS ID is a family/grouping identifier and may not uniquely identify an Analytics row.
- Report missing, duplicate, conflicting, grouped and unmatched identities. Keep them unresolved until evidence or an approved mapping resolves them.
- Keep the original source value beside every normalized value so the transformation is auditable.

**Gate:** Do not apply a Jenkins finding to a specific item when its identity is grouped, ambiguous or unsupported by the inspected schema.

### 4. Build an isolated candidate

- Create a run-specific manifest from `dev/config/snapshot-source-manifest.example.json`; record the actual snapshot date, input filenames, hashes and confirmed view-window definitions.
- Run `dev/scripts/prepare-snapshot-refresh.py` into a new candidate directory under the private run folder.
- Keep contact-bearing/full inventory and readiness reports private. Do not overwrite canonical inventory, saved Admin state or prior source bundles during preparation.
- Record candidate output paths and all readiness/validation results.

**Gate:** Candidate preparation is not approval to apply Analytics or QA data.

### 5. Review differences and calculations

Compare candidate to the active snapshot and document:

- additions, removals, status and Workshop/Sprint changes;
- missing or duplicate IDs, unmapped tags, unmatched/shared demand and material view changes;
- source dates, periods, QA run completeness and per-ID QA match coverage;
- score changes, P1 separation, P2/P3 treatment and retirement-review changes;
- source evidence freshness and any provisional or blocked conclusions.

Reconcile any material difference before approval. A missing row, unpublished state or removal request alone does not prove an item was retired.

**Gate:** Unexplained material differences leave the run at `NEEDS_REVIEW`.

### 6. Obtain explicit review before applying

Provide Lucian a concise run report with source statuses, dates, counts, hashes, material changes, validation, unresolved items and candidate paths. Wait for approval before:

- integrating the candidate as active Analytics data;
- applying a Jenkins/QA merge to the refreshed cohort;
- clearing freshness/governance flags; or
- publishing any artifact to Object Storage.

Record who approved, what exact candidate/run was approved, and when. Approval of one step does not imply approval of later steps.

### 7. Integrate and validate the approved candidate

After approval, follow `dev/docs/snapshot-refresh-and-release.md` to regenerate the public projection, run applicable data and browser checks against the integrated candidate, export the reviewed dashboard state, build the static release and run strict release preflight. Keep QA merge evidence cohort-scoped and bound to the exact public inventory hash.

Record test commands, result files, passed/failed counts and the release manifest identity. A test against old active data does not validate the new candidate.

### 8. Publish only as a separate approved operation

Before upload, confirm the approved release ID, destination, access model, content types, route and rollback release. Upload the static release through the approved authenticated Object Storage path; keep the Admin service and full/contact-bearing data outside the public static bundle. Verify uploaded object hashes/routes and smoke-test the destination. Preserve the prior release and route for rollback.

Do not claim publication until the destination is verified.

## Completion report template

```text
Run ID / date:
Overall status:
Source status and source date:
  WMS inventory / classification:
  LiveLabs dashboard periods:
  Tags (product / role / focus / sales play):
  Jenkins QA report:
Raw input names, row totals and hashes:
Candidate path and manifest identity:
Material inventory, score and QA differences:
Validation run and evidence paths:
Unresolved issues / blocked steps:
Approval recorded for:
Integration status:
Object Storage publication status and verified destination:
Rollback reference:
Next action and owner:
```

## Instructions still needed from Lucian

- Exact WMS report pages, filters, export buttons, formats and expected completeness evidence.
- Exact LiveLabs dashboard reports, periods, filters, export actions and source definitions for each period.
- Exact tag export steps and confirmation of whether all four tag dimensions remain required.
- Jenkins report entry point, safe browser navigation, completed-run criteria and exact export package available when the service is reachable.
- Any source-specific row-count expectations, timing limits, retry rules or handoff requirements.
- The approved reviewer and explicit approval wording for integration, QA merge and Object Storage publication.

Until these instructions arrive, this file is a protocol template only. The existing Monday automation remains unchanged; no new collection or publication behavior is authorized by this template.
