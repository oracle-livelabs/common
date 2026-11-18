# Jenkins reports in Analytics Admin

## Implementation plan

1. Compare Marco-03/common main at `84f5ffd2e3acb2f715782b80c94ed670680d151c` with the local QA pipeline and renderer.
2. Preserve the canonical project, applied merge, source inventory and original report files. Vendor only the pinned renderer and its direct dependencies.
3. Rebuild saved JSON exports into a private, versioned report archive. Keep upstream report search, filters, pagination, issue guidance, downloads and retest selections.
4. Add authenticated Admin navigation and report delivery. Apply Redwood styling separately from the upstream renderer.
5. Support rich JSON import without assigning grouped evidence to unrelated IDs. Keep live Jenkins execution visibly unavailable until configured.
6. Verify source preservation, identity checks, access controls, rendering and local HTTP service.

## Source comparison

The referenced branch was at the commit above, dated 23 October 2026. Generated report files are ignored by Git; the repository contains implementation code, not a newer test run.

Compared with the local QA checkout, this branch adds a retest channel and selection payload, queues builds without aborting the active build, checks all content links by default, limits retained traces to retests, and removes temporary execution artifacts after publication. Its generated-test paths differ from the local coverage-gated test layout. Copying its Jenkinsfile over the local pipeline would remove local coverage gates, so the pipeline is not replaced.

The report renderer adds issue audience/priority, actionable source locations, affected links, reproduction and repair guidance, complete JSON and detailed findings exports, shared retest selection and Jenkins run tracking. The integration pins those renderer dependencies under `dev/vendor/marco-qa`; route, theme and archive adaptations live outside that copy.

## Data boundaries

The newest supplied export is the archived 15 October run with 918 grouped catalog entries and 4,193 checks. The applied Analytics snapshot contains 924 distinct LiveLabs IDs. Six IDs present in that snapshot are not primary IDs in the grouped export: 3450, 3719, 3940, 4252, 4267 and 4358. Report grouping is not permission to copy findings between those IDs.

Rebuilding the report does not execute tests, refresh the Analytics data snapshot, or replace its applied merge. Source hashes and run metadata identify each private report version. Missing screenshot/trace files remain unavailable; source locations and link details are retained when present.

The Admin report is served by the local Python service. It is excluded from the public static Object Storage package. A future hosted Admin service needs authentication and a configured Jenkins connection; static Object Storage alone cannot run retests or persist shared review lists.

## Current integration

Open `/admin/jenkins` for the latest full report; `/admin/jenkins/history` selects saved runs. Both the full report and its retest list now receive the shared Admin sidebar at response time, without an iframe. The archived HTML remains immutable. CSP hashes and gzip output are derived from the served document. The report keeps upstream search, status/priority filters, 25/50/100-row pagination, expandable findings, exact lab links, developer evidence, CSV/JSON downloads and Retest List selection. Selections persist in the protected Admin database. Payload download/copy supports a manual QA-script handoff. Live Jenkins execution and protected PAR resolution are explicitly unavailable; no job submission is simulated. Missing binary attachments are omitted while all 638 recorded error/step entries are retained.

The original renderer files are unchanged. An adapter redirects navigation into Admin, isolates review storage, adds the authenticated review-list bridge, validates run IDs before HTML generation, and applies a separate Redwood stylesheet. Report routes require an Admin session, deny arbitrary files, and authorize only the generated inline scripts through CSP hashes. List changes require the existing Origin and CSRF checks.

Data Merge accepts Jenkins JSON up to 90 MB (findings tables remain limited to 20 MB). Single Complete JSON import now retains `checks`, run metadata and diagnostic evidence. It rejects multi-ID groups; the reconciled JSON/CSV path remains available. These import changes do not automatically apply a merge.

Rebuild a newly received export without executing checks:

```powershell
python dev/scripts/build-jenkins-report.py --source "C:/path/to/catalog-results.json"
```

The builder pins upstream dependencies, hashes the source and adapter, and adds a private immutable report version. The current report HTML is 18.94 MB including diagnostic evidence, transferred as 1.10 MB with gzip. The complete JSON download is about 63.12 MB (4.72 MB with gzip). Older intermediate builds from this implementation are archived outside the project under the task artifacts; the supplied export remains untouched.

## Validation and remaining setup

Validated 65 Python tests, 80 dashboard checks, two Node adapter/rendering fixture scripts, and 33 upstream renderer tests. Browser checks use an isolated authenticated test database with the real saved report, preserving the user's credentials and applied merge. Search, issue details, Retest List selection and JSON payload download were exercised. The main local service serves `/dashboard/` and the protected `/admin/jenkins` route.

Remaining deployment work: receive a genuinely newer QA run and Analytics snapshot, reconcile IDs and preview the merge, then publish the reviewed public static bundle to Object Storage. For live Admin actions, configure a protected QA Hub/Jenkins bridge and report synchronization. Preserve local coverage gates when adapting the upstream retest pipeline; do not overwrite the Jenkinsfile wholesale.

## Objectives

Document how saved Jenkins report evidence is integrated into the Analytics Admin and the remaining deployment work.

## Estimated Time

Estimated Time: About 10 minutes to review the integration and boundaries.

## Acknowledgements

The integration was verified locally with an isolated test database; live Jenkins data refresh and production deployment remain separate.
