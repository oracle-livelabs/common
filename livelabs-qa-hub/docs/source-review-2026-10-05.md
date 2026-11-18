# QA Hub source review

Reviewed 5 October 2026. This review separates checked-in configuration, saved local evidence, public web references and unverified live services. It is a component/integration inventory, not an end-to-end execution audit of every workshop.

Follow-up: [Architecture and component actions review](architecture-and-actions-review-2026-10-05.md) expands the directory/tag trigger inventory, Analytics/author workflows, page structure and deployment findings. Both supplied live pages failed browser certificate trust; both configured OCI profiles returned `NotAuthenticated` on read-only inventory requests. Deployed VM/job/report details remain unverified.

## Important findings

| Area | Verified source evidence | Consequence for the Hub |
| --- | --- | --- |
| Current run evidence | Two local saved runs from 24 September; each has 58 checks: 38 passed, 10 unexpected, 10 skipped. Both completed; raw report status is `failed`. | Display Completed with findings plus raw status in detail. Label Local artifact and Stale snapshot. Do not attribute them to Jenkins. |
| PAR coverage | Both saved runs have `parAudit.has_data:false`, zero pages scanned and zero link measurements. | Show Not measured and dashes, not a healthy zero. Spec execution is not PAR catalog coverage. |
| CI job design | `livelabs-overall-regression` delegates to `livelabs-qa-engine`. Engine profiles are PR slice, nightly full and manual items. | One execution service with profile-specific UI. Resolve wrapper versus engine permissions before offering PR slice. |
| Report storage | `history.json` references immutable `runs/<runId>/summary.json` and HTML. Publisher/archive includes reports, generated catalog, artifacts and JUnit. | Reuse the producer and report viewer; normalize metadata for tables/trends. |
| Old PAR paths | Job DSL removes `livelabs-par-audit`; Nginx redirects `/par/` to `/regression/`. Legacy PAR retest output still links to the deleted job. | Repair the compatibility link before activating targeted PAR retests. Do not propose a new separate PAR scheduler. |
| Deployment identity | README describes corporate SSO/groups; actual portal uses htpasswd Basic authentication. JCasC config uses a local realm and `loggedInUsersCanDoAnything`. | Reconcile source and deployed identity. Do not infer operator/viewer authorization from documentation. |
| Embedding | Portal CSP sets `frame-ancestors 'none'`; `X-Frame-Options` is DENY. | Use same-origin API projections and protected report links instead of an iframe. |
| On-call | October 2 activation config has `enabled:false`. A daily 09:00 Europe/Bucharest local heartbeat is configured ACTIVE. A status-only Slack delivery was read back in the earlier activation work. | Schedule configuration, enabled intake, execution and delivery are different metrics. Live cases and unattended monitoring remain unverified. |
| Repository scope | 30 local checkouts contain 3,184 tracked manifest files and 50 workflow files. | Useful local inventory, not unique workshop count, active CI coverage, or live org completeness. |
| Public access | Public GitHub pages were readable through web browsing; direct REST inventory failed with TLS/connection errors in this environment. | No current live PR/check counts are claimed. Local/dated evidence remains labeled. |

## QA Automation

Authoritative local files reviewed:

- `qa-automation/README.md`, `package.json`, `playwright.config.ts` and `Jenkinsfile`.
- `deploy/vm/jenkins/jobs.groovy`, `casc.yaml`, `compose.yaml`, portal Nginx/auth configuration and deployment README.
- `scripts/classify-run-outcome.mjs`, `scripts/reporters/root-summary-reporter.mjs`, `par-link-report.mjs` and saved `reports/history.json`/run summaries.
- Runbooks for generated catalog and PAR audit; test directory inventory; published-workshop QA runner/app.

| Lane | Spec files | Role |
| --- | --- | --- |
| Public smoke | 8 | Homepage, search, catalog, responsive/accessibility and event entry |
| Public regression | 9 | Catalog filters, search, overviews, instructions and resources |
| Generated catalog | 6 | Runtime-expanded workshop and LiveStack coverage |
| PAR | 2 | Audit checks and supporting core cases |
| Authenticated | 3 | Private navigation and reservations, using approved auth state |
| Total | 28 | Source-file count; expanded/executed test count is separate |

The published-workshop QA app is another producer at `QA_GUI`, with report JSON/Markdown and local history. The plan should ingest its results as a distinct run profile after an identity/schema mapping; its presence does not establish integration today. Generated instruction-page checks explicitly do not provision or execute workshop resources.

The current report classification distinguishes execution failure from completed runs with findings. A Jenkins `UNSTABLE` result, raw report status `failed`, and completed scan can coexist; the API must retain each source fact.

## On-call sources and prior work

Reviewed the existing Hub `on-call-review.mjs` contract, public synthetic manifest and documentation; the source/governance workspace `Tasks/livelabs-authors-help-ai-helper/runtime`; and the newer `Tasks/livelabs-livestacks-periodic-health-check/ON-CALL-ACTIVATION.md`, runbook and `config/on-call.json`.

The October 2 activation plan supersedes the older September Slack-first handoff where they differ. Four inputs are configured: authors-help Slack plus three scoped mail sources. The runtime has injected read-only collectors, deterministic case/draft processing, exact-revision review and sealed synthetic report artifacts. It does not prove live intake or a deployed AI drafting provider.

The saved Codex automation is named LiveLabs On-Call Operations Automation. Its local heartbeat is ACTIVE and configured daily at 09:00; source intake remains disabled. This review did not run, edit or reschedule it. A separate Daily Briefing and paused Daily bug scan are not substitutes for the dedicated on-call pipeline.

Real-source authorization, full-context reading, private reviewer audience, retention, approved guidance and unattended execution still need evidence. The prior status-only Slack post proves a narrow connection capability; it does not prove support replies, private-case publication or recurring dispatch. No live support content was copied into this repository.

## GitHub and shared content validation

The working `common` checkout has a personal fork as origin and `oracle-livelabs/common` as upstream. QA Hub, QA Automation, Analytics and Author Guide are folders in that repository, not four independent Git repositories. Preserve this boundary in commits and deployment paths.

Shared workflows reviewed:

- `.github/workflows/markdown-lint.yml`: PR-triggered Markdown validation.
- `.github/workflows/enforce-image-size.yml`: PR-triggered image validation, including the 1280px threshold.
- `.github/workflows/content-validation.yml`: manual `workflow_dispatch` with content-read permission. Its presence does not prove a pull-request gate.

The five local checkouts with no tracked workflow files are `adb`, `aichatbot`, `cloudtestdrive`, `livelabs-archive` and `sprints`. This is a discovery signal only; external/reusable/org-level automation and remote changes were not ruled out. Local manifests include variants and supporting manifests, so the 3,184 count is not a workshop count.

Public sources reviewed: [QA Automation](https://github.com/oracle-livelabs/common/tree/main/qa-automation), [QA Hub](https://github.com/oracle-livelabs/common/tree/main/livelabs-qa-hub), and the [LiveLabs repository directory](https://github.com/orgs/oracle-livelabs/repositories?type=all). Web results included cached content. Do not use their displayed dates or PR totals as a current live inventory. The public listing also surfaced repository names absent from the local set, including `livestack` and `cloud-database-services`; reconcile the complete organization list with an authenticated paginated API before setting production scope.

Implementation API references: [Jenkins Remote Access API](https://www.jenkins.io/doc/book/using/remote-access-api/) for build/job reads and controlled parameterized triggers; [GitHub REST pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api) for complete multi-page collection.

## UI review and implementation evidence

The original Hub repeated titles, introductory paragraphs, metric cards, domain cards and launcher navigation. The current rework uses a shared table component and direct menu. It reuses the Analytics color/type/rail approach, Author Guide wayfinding and reporter collection/detail patterns.

Local API endpoints are `GET /api/local/reports`, `/api/local/framework` and `/api/local/repositories`. They read fixed sibling roots, reject non-read requests, validate Host/origin, and keep private/local report payloads out of static build assets. Report projections omit raw error blobs, contact lists, auth state and PAR URLs. Original report HTML is a separate local read-only view; its operational network actions remain blocked.

Current checks: JavaScript syntax checks, static build, HTTP 200 for the Hub/read endpoints and manual rendered interaction review. No automated test suite, remote Jenkins job, workshop test run, deployment, Slack post or GitHub write was performed in this request.

## Local repository inventory

The table below is generated from current local Git metadata and tracked filenames. It must not be treated as remote freshness or content-quality certification.


| Repository | Manifests | Workflows | Local commit | Local commit date |
| --- | --- | --- | --- | --- |
| adb | 175 | 0 | e52693b0 | 2026-03-11 |
| ai-gpu-solutions | 43 | 2 | ce372ed | 2026-02-13 |
| aichatbot | 0 | 0 | 715ae5c | 2025-01-22 |
| analytics-ai | 250 | 2 | edb53a40 | 2026-03-12 |
| apex | 129 | 2 | 6133bea5 | 2026-03-12 |
| cloudtestdrive | 17 | 0 | 43f6d70 | 2026-03-12 |
| common | 47 | 3 | c1c5ce1a | 2026-10-05 |
| converged | 81 | 2 | a179eec | 2026-04-07 |
| database | 408 | 2 | e75107fe | 2026-03-12 |
| database-maa | 37 | 2 | 13b99ab | 2026-09-23 |
| demo-factory | 35 | 1 | 45ffe2a6 | 2026-09-24 |
| developer | 226 | 2 | f70b41e9 | 2026-03-12 |
| em-omc | 290 | 2 | 3f1e47e4 | 2026-03-12 |
| goldengate | 97 | 2 | bafb2a2 | 2026-03-12 |
| livelabs-archive | 0 | 0 | ab8f8d7 | 2025-03-06 |
| multicloud | 47 | 2 | 9e195cb | 2026-03-12 |
| oci | 290 | 2 | 56a54901 | 2026-03-12 |
| oci-core | 72 | 2 | d1e2f11 | 2026-09-07 |
| oci-hpc | 23 | 2 | c1ee34e | 2026-05-20 |
| oci-migration | 29 | 2 | 6706aaa | 2026-06-03 |
| oic | 37 | 2 | 383cce2 | 2026-09-24 |
| oml | 44 | 2 | f145070 | 2026-09-21 |
| oracle-health | 7 | 2 | 896897c | 2026-04-07 |
| partner-solutions | 51 | 2 | ae794a9 | 2026-03-12 |
| pts | 90 | 2 | d3afd71 | 2026-03-12 |
| security | 170 | 2 | 1a0baf0 | 2026-03-12 |
| spatial-graph | 48 | 2 | 5b1e284 | 2026-08-06 |
| sprints | 413 | 0 | ab7db1e | 2026-03-12 |
| university | 11 | 2 | 683e64d | 2026-07-30 |
| weblogic | 17 | 2 | ef7e8f2 | 2026-04-07 |
