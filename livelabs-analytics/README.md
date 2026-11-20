# LiveLabs Analytics

Use the generated **`upload/website/` contents** for Object Storage, after its readiness gates pass. The repository itself contains private source data and developer tools and is not an upload directory.

| Directory | Purpose |
|---|---|
| `assets/`, `dashboard/`, `search/`, `views/` | Website source and shared UI assets |
| `inventory/data/` | Source inventory and generated public projection; do not upload this directory wholesale |
| `dev/` | Admin source, generation scripts, tests, configuration and historical review material |
| `deploy/` | One upload builder, source-data review and deployment instructions |
| `upload/` | Generated website, private service archive and verification evidence, separated for handoff |
| `.private/` | Credentials, databases, private contacts and source candidates; never upload to Object Storage |
| `archive/`, `output/` | Retained historical recovery and screenshot evidence; excluded from packaging |

Build and review with [the deployment instructions](deploy/README.md). Current readiness is recorded by the build, not inferred from a folder name or a successful local preview.
