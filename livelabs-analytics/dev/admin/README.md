# Administration and snapshot review

The dashboard remains a static release. Administration runs as a separate,
authenticated local service; its only page entry point is `/admin-panel-login`.
This URL renders the sign-in form until a server-issued session is valid, then
renders the admin panel. There is no dashboard navigation link to administration.
Private APIs and assets check the session independently.

From the project root:

```powershell
python dev/scripts/admin-server.py --configure
python dev/scripts/admin-server.py --port 4175
```

For a generated initial password instead of interactive setup, run
`python dev/scripts/admin-server.py --initialize-local-account` once. Credentials
are stored in the project's `.private/admin` folder, excluded by `.gitignore`
and all deployment packages. The server never serves this folder. Change the
generated password in Account.
The service binds only to loopback. Sessions expire after two hours; sign-out
and password changes revoke them. Passwords are stored as salted PBKDF2 hashes,
cookies are HttpOnly/SameSite Strict, mutations require an origin check and
session CSRF token, and sign-in attempts are bounded.

## Snapshot workflow

Use `dev/config/snapshot-source-manifest.example.json` as the input contract;
replace its date and filenames with the actual incoming exports. Optional
`sha256` entries keyed by source role enforce expected hashes. Every input hash
is recorded in generated provenance. Prepare a review bundle without changing
the active dashboard:

```powershell
python dev/scripts/prepare-snapshot-refresh.py --snapshot "<source-directory>" --manifest "<manifest.json>" --output "dev/snapshots/<new-snapshot-review>"
```

This captures the baseline, reconciles inventory in the review directory,
regenerates Top Performers, writes its file mirror, and produces before/after
comparison bundles. It retains the actual dates of older Git evidence and marks
historical governance queues as requiring refreshed evidence. Publish types
supplied by WMS take precedence; carried classifications are explicitly labelled.
Import the before/after bundles into administration before promoting files.
The new source snapshot has not been supplied yet, so preparation has not been run.

1. Capture the current inventory **before** refreshing. This stores the canonical
   record set, source metadata, SHA-256 identity, and calculated Top Performer
   rankings under the current algorithm version.
2. Download the captured bundle for a portable archive.
3. When new source exports arrive, reconcile them through the existing refresh
   pipeline. Confirm publish-type authority, reporting-period definitions and
   Git/replacement evidence dates before approving dependent outputs.
4. Capture the newly reconciled inventory. Compare earlier and later captures.
   Imports also accept canonical portfolio JSON, but rank movement is available
   only when both snapshots contain matching algorithm-version ranking bundles.
5. Review the data quality queue and export all matching issues. Reporting-period
   anomalies are conditional checks, not declarations that source data is corrupt.
6. Record decisions against a specific snapshot and content identity. Replacement
   approval/rejection requires a distinct candidate identity. Reviewer and date
   come from the authenticated account and server clock. Entries are append-only;
   record a superseding decision when needed. They never overwrite algorithmic
   suggestions or disable content.

Snapshots, sessions, account hashes and review history live in `admin.sqlite3`
in the private project runtime folder. Back up this database while the service is
stopped. Static release packaging excludes admin code and runtime data. Deploying
administration requires a separate approved service behind HTTPS and the intended
identity provider or this service's configured accounts; hosting the static bundle
alone cannot provide admin login. See `TENANCY-DEPLOYMENT.md` for service packaging,
private credential transfer, HTTPS origin configuration and gateway routes.

## Exports and comparisons

CSV exports use N/A for empty cells and preserve genuine zero values. CSV cannot
encode bold headers, widths, alignment, frozen rows or filters. Formatted Excel
exports use `.xlsx`, wider columns, wrapped text, left alignment, bold shaded
headers, a frozen header and filters. Long values remain intact in cells.

Replacement comparison lives on the main dashboard. It presents supplied
descriptions/objectives, prerequisites, products, versions, environment and
update evidence side by side. Missing evidence is explicit; substitutability is
not inferred from a match score. Human decisions remain in administration.
