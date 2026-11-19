# Upload structure and release review

Goal: deliver a shallow, reviewable upload directory that includes the current UI and reviewed data, with reproducible validation and an explicit readiness result.

Scope and design:

- Preserve the existing working tree and public routes. No branch, commit, push or tenancy upload is part of this work.
- Build `upload/website` from explicit runtime inputs. Group public runtime JSON under `assets/data`; retain the small dashboard/search/views route directories.
- Put the authenticated Admin service archive in `upload/service` and review evidence in `upload/verification`. Neither is website content.
- Keep private runtime databases, credentials, source exports, contact indexes, developer dependencies and historical artifacts out of the website.
- Compare current inventory, demand, WMS dates, QA and Git evidence against the latest supplied update set. Preserve each source date and record identity by LiveLabs ID.
- Keep promotion gates honest: supplied-file currency, browser checks and package integrity do not establish a deployed gateway, authentication configuration or a live source refresh.

Implementation:

- [x] Reconcile supplied source-set dates, hashes, identity grain and current generated outputs. Newer input remains blocked by documented source conflicts.
- [x] Repair confirmed generation/validator drift. Python: 110 pass. Source validator: 86 pass. Full browser rerun is recorded separately.
- [x] Add a compact static layout option; use manifest-declared data locations in validators and exact-artifact browser checks.
- [x] Add one upload builder with guarded output handling, service archive, local instructions, manifests and a source-aware readiness report.
- [x] Verify package boundaries, hashes, references, access-bearing patterns and root/prefix hosting with the packaged website. Packaged browser assertions: 104 pass.
- [x] Produce the final upload directory and report technical readiness, source freshness and remaining tenancy prerequisites separately. Full source browser suite: 53 pass. Extracted service: 10 pass. Strict preflight: 16 pass and three explicitly unresolved promotion gates.

Review focus: source identity must not collapse WMS families; missing metrics must remain unknown; packaged QA must match the packaged public inventory; private contacts must remain private; relative routes/CSS must survive an Object Storage prefix; prior artifacts and unrelated dirty files must remain intact.
