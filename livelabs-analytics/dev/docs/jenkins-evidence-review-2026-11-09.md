# Jenkins finding evidence repair — 9 November 2026

The Complete JSON supplies the locations shown in Marco's report. Analytics was losing nested fields during normalization and rebuilding paired imports from CSV summaries without retaining matching JSON evidence.

## Export contents

| Export | Available information |
| --- | --- |
| Complete JSON | Issue explanations and suggested actions; affected links/images; lab URLs and titles; Markdown source URLs and lines; sections, excerpts and typo markers; nested PAR source locations; HTTP response, object, bucket, namespace, region and fingerprint. Availability varies by check. |
| Findings CSV | Item identity, run, priority/severity, summary, workshop URLs, and QA test file/line. The test line is not the Markdown content line. The inspected CSV has no nested source locations or PAR diagnostics. |

PAR URLs in the export mask their access token. The local page displays and copies the masked object path, links to the original lab/source, and does not turn the masked PAR into a downloadable link. Marco's full-link resolver is a separate service and was not contacted or recreated.

## Changes

- Preserve nested source locations, common URL aliases, source excerpts and PAR diagnostics in the allowlisted evidence adapter. Sanitize text and URLs on import and reimport; retain distinct markers and merge all locations only for the same link identity.
- Join CSV findings with JSON evidence only when run, primary LiveLabs ID, type, check code, section, QA file/line and occurrence count agree. Duplicate candidates and grouped aliases do not inherit evidence. Existing category/count reconciliation remains enforced.
- Display exact lab/source links, Markdown lines, sections, highlighted source excerpts, copy controls and collapsible technical details in the shared error renderer. The existing CSV export includes this content and its source URLs.
- Use the same exact-identity evidence enrichment for the public dashboard and authenticated Admin overlay.
- Rebuilt the private evidence sidecar from the archived Complete JSON. All 835 existing check identities were preserved; 154 nested source locations are now retained. The prior sidecar and before/after metrics are backed up in `.private/admin/evidence-backups/20261109-130045/`.

## Source reconciliation limits

The user-supplied `report.json` contains 828 issue entries. The saved archive contains 835 entries, including seven additional typo checks, under the same October 15 run ID. Its Complete JSON advertises 903 category rows while its findings CSV contains 835 issue rows. The original download advertises 828 category rows and also does not reconcile with that 835-row CSV.

These are different export variants; sharing a run ID alone does not establish a matching import pair. The importer correctly rejects the mismatched totals. The repair used the archived source whose exact 835 finding identities equal the existing sidecar, preserving the applied merge and all score/count data. It does not constitute a new QA run or a fresh inventory snapshot. Future grouped exports need a reconciling JSON/CSV pair.

## Verification

- Before/after API comparison: identical 861 matched LiveLabs IDs, report run IDs, scores, priority counts, occurrence counts and finding identities.
- Python suite: 84 passed, including nested evidence, exact-identity isolation, duplicate locations and token handling.
- JavaScript adapter/rendering checks passed, including ambiguous matches, differing counts/runs, safe links and nested source rendering.
- Dashboard validator: 80 passed, zero warnings or failures.
- Full browser suite: 17 passed, covering Admin pages, assignment actions, dashboard calculations, filters, responsive layouts and detailed report exports.
- Browser regression verifies LiveLabs 4021: both model downloads, two source locations per model, Markdown lines 308 and 311, HTTP 401, source and lab URLs, masked URL/source copying, typo highlighting at line 85, CSV export, desktop/mobile layout and no page errors.
- Desktop and mobile screenshots were inspected in `output/screenshots/jenkins-evidence-20261109/`.
- An existing score test initially read a lazy table before the QA overlay applied. It now waits for the exact applied merge ID before comparing every score; scoring code was not changed.

All changes are local. No remote QA Hub access, WMS changes, new QA execution, source-data refresh, or Object Storage publication occurred.

## Follow-up: lead with the content location

Error expansion now starts with each affected item and a visible **Check here first** panel. The most specific recorded source appears first: source file and Markdown line take precedence over a generic rendered-page location. The panel shows the lab, task/section, content line, direct lab/source links and highlighted excerpt. Generic summaries, other locations, technical diagnostics and QA test metadata remain available in disclosures below. Missing locations are explicitly marked for verification.

LiveLabs 3570 from the follow-up screenshot now leads with **Lab 2: Load JSON tweets**, **Task 1: Upload JSON tweets into Object Storage**, **Markdown line 29**, highlighting `labfiles/JSON_Full_tweets.jsonn`. The source label's workshop/context prefix follows the excerpt so the lab name appears first. No evidence or score data changed.

Validation: five detail-page browser tests passed, rendering unit checks passed, and 80 dashboard checks passed. The final location test was rerun after label/color refinements. Desktop/mobile screenshots in `output/screenshots/jenkins-location-first-20261109/` were inspected. CSV export retains guidance, technical fields and other locations even when their disclosures are closed.

## Follow-up: compact record details

Ownership and publishing now appears first and opens by default. Error summaries show the issue, location, reported occurrences and report date; guidance and technical fields remain expandable. Source excerpts use short highlighted previews with the full text available on demand. The original workshop/context label remains in the location title attribute.

Removed the requested activity, retirement-readiness and shared-demand paragraphs. The score table retains its four columns in a compact layout with readable desktop and phone widths. Scoring and underlying evidence are unchanged.

Validation: 11 browser checks passed, including ownership ordering, compact error groups, mobile column overflow, score values, copying and CSV exports. Rendering unit checks and 80 dashboard checks passed. Desktop and phone screenshots were inspected in `output/screenshots/compact-record-20261109/`. These are local UI changes; no new report run or publication occurred.

## Objectives

Summarize the Jenkins finding detail changes, evidence limits, and browser verification.

## Estimated Time

Estimated Time: About 5 minutes to review this evidence summary.

## Acknowledgements

Checks used a local disposable test database and retained report data; no new report run or publication occurred.
