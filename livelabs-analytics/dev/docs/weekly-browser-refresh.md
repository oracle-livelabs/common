# Weekly Analytics refresh through the browser

Schedule: Monday at 10:00, Europe/Bucharest. The automation returns to the existing Analytics chat.

## Access

Use the connected Edge browser and Lucian's existing authenticated session:

- WMS: `https://livelabs.oracle.com/ords/r/wms/wms/home`
- LiveLabs dashboard: `https://livelabs.oracle.com/ords/r/dbpm/livelabs/dashboard`

Discover current tabs each run. Do not save session-bearing URLs, cookies, passwords,
or authentication tokens in prompts, reports, source manifests or repository files.
If authentication, MFA, browser connectivity or a permission prompt blocks access,
report the exact handoff needed and stop dependent collection. Resume the same run
after the user reconnects; preserve completed work and avoid duplicate imports.
The computer must be on, the desktop app running, and the browser connection available.

## Collection

1. Create a unique run folder under `.private/admin/weekly-refresh/` using the
   Bucharest date and time. Retain original downloads under `sources/`; record
   source labels, filters, selected columns, observed row totals, capture timestamps
   with timezone, source-provided dates and SHA-256 hashes in a collection manifest.
2. Collect the full WMS inventory from **All Workshops & Sprints**, including
   public, private, disabled and removal-requested records. The report for only
   published workshops is insufficient. Include LiveLabs ID, WMS ID, both status
   fields, publish type, content type, titles, contacts, source URLs and available
   date fields. Collect the Sprint classification input and product, role, focus
   and sales-play tags required by the source manifest. A legitimate source with
   zero rows must be distinguishable from a failed or unavailable source.
3. Collect LiveLabs **Workshop Ranks** for Last Week, Last Two Weeks, Last Month,
   Last 90 Days, Last 180 Days and Last Year. Preserve exact source labels, values,
   available stable item IDs and ranks. Verify complete exports/pagination for
   every period; the first visible rows are insufficient. Prefer CSV/Excel exports;
   use supported browser DOM reading if no export exists. Preserve raw captures
   before normalizing them for the existing views workbook format.
4. Record explicit start/end dates, timezone and cumulative/calendar/rolling
   definitions when the source supplies them. If absent, label them unconfirmed.
   Collection time is not proof of the metric window. Do not enable trends from
   inferred periods. Do not silently drop unmatched titles or distribute shared
   title traffic across individual IDs. A new ID-based join needs an inspected
   schema and validated mapping before use.
5. Live QA Hub and Jenkins collection is deferred at Lucian's request because
   that server is down (November 9, 2026). Do not contact the server, retry access,
   request a login or pursue server recovery during weekly refreshes. Keep this
   source deferred until Lucian explicitly asks to resume it. QA deferral does
   not block WMS/LiveLabs collection or preparation of their review candidate.
6. Retain existing QA evidence with its original run date. A separately supplied
   local report can be validated if requested, but do not present historical QA
   as newly collected or automatically apply another merge. The supplied local
   fallback under `.private/admin/qa-source-inbox/` is the October 15 run; grouped
   IDs still require reconciliation before any per-ID merge. Do not start
   Jenkins jobs or claim refreshed Git/update evidence from a new WMS capture.

## Preparation and review

Follow `dev/docs/snapshot-refresh-and-release.md` and the source manifest example.
Validate the actual collected schema before constructing normalized inputs. If
required fields, complete pagination or source identity cannot be established,
retain the evidence and report a partial run; do not manufacture a complete bundle.

When all required WMS/views/tag inputs are complete, run
`dev/scripts/prepare-snapshot-refresh.py` against the collected source manifest,
using a new review output directory in this run folder. Supply a Jenkins export
only when it is available and validated. This builds an isolated candidate.

Compare candidate and current inventory: added/removed IDs, Workshop/Sprint
classification, publication/workflow changes, missing and duplicate identifiers,
unmatched/shared demand, large view changes, dates, QA coverage and validity,
P1 separation, ranking changes, retirement review bands and evidence readiness.
Unexplained differences remain review findings. A missing row does not establish
that content was retired. Preserve previous source bundles for rollback.

Run checks appropriate to the staged candidate. After an approved local integration,
run the documented Python, Node, browser and release checks against the integrated
version. A test against the old active data does not validate the candidate.

Finish with a private run report: collection status for each input, captured dates,
row counts, hashes, changes, validation results, missing evidence, candidate paths
and the next action. Distinguish collected, prepared, validated, applied and published.
Ask for review of the concrete candidate before promoting it or applying a QA merge.
Object Storage publishing is a separate approved step.

## Run states

- `NEEDS_SIGN_IN`: browser or authentication handoff required.
- `PARTIAL`: one or more required inputs are unavailable or incomplete.
- `NEEDS_REVIEW`: collection complete; reconcile schema, dates or material changes.
- `READY_FOR_REVIEW`: candidate prepared and applicable validation passed.

The access test on November 9, 2026 confirmed authenticated reading of both sources,
WMS export choices and the LiveLabs date selector. Full collection, normalization
and the first scheduled refresh still require an end-to-end run.

Lucian confirmed on November 9 that the QA server is down. Live collection is
now deferred; the earlier HTTPS test timed out before authentication and did
not verify the supplied account credentials.
The supplied local Complete JSON is the completed October 15, 2026 run, containing
918 catalog entries and 4,193 checks. Six entries group multiple LiveLabs IDs, so
the existing adapter blocks a direct per-ID merge. It is retained as historical
fallback evidence, not a newly executed run or an already-applied QA update.

## Objectives

Guide a browser-based Analytics evidence refresh and explain the recorded run states.

## Estimated Time

Estimated Time: About 10 minutes to review the collection workflow.

## Acknowledgements

The report separates historical fallback evidence from a newly executed run and an applied QA update.
