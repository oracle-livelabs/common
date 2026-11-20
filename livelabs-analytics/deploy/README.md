# Build and review an upload

From the project root, with the reviewed local Admin service running:

```powershell
python deploy/build-upload.py --service-url http://127.0.0.1:4176
```

The builder checks the source-derived files, exports the current public-cohort QA projection, builds both artifacts, scans their boundaries, exercises the packaged website without an API, and runs strict preflight. It preserves an existing output; choose a new `--output dev/releases/<name>` for another build.

The default source review compares the current November candidate. For a later reviewed input set, supply its private candidate directory using `--candidate <directory>`. Freshness checks require unchanged inputs, an active matching inventory, resolved classifications/tags/periods, fresh QA and no unresolved candidate review gates; they do not become true merely because the build date changes.

```text
upload/
  website/                 # Only these contents are Object Storage objects
    index.html
    release-manifest.json
    dashboard/index.html
    search/index.html
    views/index.html
    assets/                # Shared CSS, JS, images, fonts, fragments and data
      data/portfolio.json
      data/score-baselines.json
      data/dashboard-state.json
  service/admin-service.zip
  verification/            # Source review, preflight, browser evidence, hashes
  READINESS.json
  UPLOAD.md
```

The website has at most three file-path levels. Semantic page routes are retained so bookmarked detail links continue to work. Developer dependencies, archives, full inventory, private contacts, source exports, credentials and databases are excluded from the website.

`READINESS.json` is the controlling result. Exit code 0 means all build gates pass. Exit code 2 leaves a technically checked candidate with explicit promotion blockers; do not call it production ready. A source update must be reconciled and reviewed before changing source-freshness/governance declarations. New timestamps alone do not establish fresh data.

Upload only `website/` contents into the release manifest's immutable Object Storage prefix, with the content types in `verification/upload-objects.json`. Put an approved authenticated gateway in front of this internal contact-bearing site. Map `/`, `/dashboard/`, `/search/` and `/views/` to their index objects; preserve queries, directory routes and the selected release prefix. Keep the prior prefix for rollback.

The Admin service archive is for a private application host, not the website bucket prefix. It preserves the supported runtime paths instead of rewriting backend imports. Configure credentials on the host. Provision `.private/admin` and supplemental contacts through a private administrative channel; they are deliberately absent from the archive. Static hosting alone cannot provide protected Admin APIs or private additional contacts. The gateway must route Admin/API requests to the service and enforce the intended authentication policy.

See [tenancy setup and private contact routing](../dev/admin/TENANCY-DEPLOYMENT.md). Local/package checks do not verify a deployed gateway or tenant configuration. No build command uploads files or changes a tenancy route.
