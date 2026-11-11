# QA Hub V4 Test Management Page Rework

Date: 2026-05-26
Status: implemented

## Objective

Make the QA Hub Test Management page more useful before users open the separate TMS app, and rename the launch action to `Open LiveLabs QA TMS`.

## Implemented Changes

- Replaced the simple link-only page with a richer QA TMS landing page.
- Added a clear explanation of when to use the TMS versus the QA Hub.
- Added KPI-style summary tiles for requirement documents, linked planning workflow, and execution reports.
- Added integration guidance for Watchdog, GitHub Intake, Knowledge Base, and Health Monitor.
- Added a five-step workflow from project scope to execution reporting.
- Renamed the launch action from `Open LiveLabs TMS` to `Open LiveLabs QA TMS`.

## Validation

- QA Hub unit tests passed.
- QA Hub project validation passed.
- QA Hub static build passed.
- QA Hub browser smoke passed and verifies the new TMS page text and renamed launch action.

## Next Improvements

- Pull live TMS counts into this page once a backend or shared storage model exists.
- Add a direct "Create requirement from Knowledge Base note" entry point.
- Add alert-to-test-case linking from Watchdog records.
- Add release readiness summary once the TMS has persisted execution history.

