# Administration and snapshot review

The dashboard remains a static release. Administration runs as a separate,
authenticated local service. `/admin` is the sign-in entry point and redirects
signed-in users to Dashboard management at `/admin/dashboard-management`.
Dashboard management and the other pages can be bookmarked individually:
`/admin/dashboard-management`, `/admin/governance`, `/admin/data-merge`,
`/admin/jenkins`, and `/admin/inventory`, in alphabetical menu order.
The shared sidebar owns the dashboard return link and Sign out. Saved Jenkins
reports and their retest lists use the same sidebar. Users settings is withdrawn;
old bookmarks redirect to Dashboard management. Governance uses tabs for snapshot
comparisons, the data quality queue, and review decisions. Private APIs and
assets check the session independently.

From the project root:

```powershell
python dev/scripts/admin-server.py --configure
python dev/scripts/admin-server.py --port 4175
```

For an already configured Windows workspace, use `./dev/scripts/start-local.ps1`.
It starts the service hidden on loopback, or verifies the existing service, and
prints `http://127.0.0.1:4175/dashboard/`. Logs stay in ignored `dev/logs/`.
Use this service for the saved Jenkins overlay; a generic static server cannot
provide `/api/dashboard-admin-state`. The canonical page source is
`dashboard/index.html`. Explicitly synchronize legacy entries with
`python dev/scripts/build-page-entrypoints.py` after reviewing a page change.
Release builders check these entries and do not regenerate source files.

## Dashboard content visibility

Portfolio inventory now includes Admin-only tests/training, internal team content,
and a classification-review queue. Use **Manage** on an individual record, select
its classification, enter a reason, and save. The service stages and rebuilds the
public projection, offline fallback and all ranking fragments before confirming.
The source inventory is never deleted or rewritten. Selecting Learner content
restores eligibility only when the record is also Public and Published.

Decisions are persisted in `dev/config/dashboard-policy.json` by LiveLabs ID
(or the exact existing record key when no ID exists). Revision checks reject
stale edits; audit history is private under `.private/admin/content-policy-history`.
The internal Slack roster is `.private/admin/team-roster.json`, outside packages.
Channel membership and an Oracle email are review context, not automatic test
classification. No whole WMS family or author is hidden by an individual decision.

The eligibility panel shows population counts, missing metrics and proxy updates.
Its retirement threshold preview is read-only. Current saved criteria remain
250 annual views and update evidence older than 12 calendar months, evaluated at
the source snapshot date. All eligible records reach QA scoring before pagination;
there is no pre-scoring top-100 cutoff. Full details remain on each record page.

Visibility publishing requires Node.js 18+ as well as Python 3.10+. If generation
fails, the previous policy and generated files are retained. Restart the service
after updating Python modules, and refresh dashboard tabs after a saved policy
change. Static releases must be rebuilt and redeployed separately.

Without “Keep me logged in,” the browser receives a session cookie and the
server expires it after two hours. With it enabled, the persistent cookie and
server session expire after seven days at the latest; eight hours without an
authenticated request ends the remembered session sooner. Both limits are
enforced by the server, and logout revokes the session immediately.

Change the password with `python dev/scripts/admin-server.py --configure`.
This interactive command revokes existing sessions. For a generated initial password
instead of interactive setup, run
`python dev/scripts/admin-server.py --initialize-local-account` once. Credentials
are stored in the project's `.private/admin` folder, excluded by `.gitignore`
and all deployment packages. The server never serves this folder. Change the
generated password with the same interactive configuration command.
The service binds only to loopback. Sessions expire after two hours; sign-out
and password changes revoke them. Passwords are stored as salted PBKDF2 hashes,
cookies are HttpOnly/SameSite Strict, mutations require an origin check and
session CSRF token, and sign-in attempts are bounded.

## Snapshot workflow

Dashboard management stores tag definitions and item assignments in the admin
database. The public dashboard receives only those tag definitions and assignments;
private review notes and field edits are not included in that projection.

Data Merge reads saved QA report run summaries from the local
`../qa-automation/reports/runs` archive and can export the selected Analytics
inventory snapshot and saved QA run to CSV. This is not a live Jenkins
connection. Set `LIVELABS_ADMIN_QA_REPORTS_DIR` to the report archive directory
when the QA automation checkout is stored elsewhere. Merged output remains
disabled until its matching, duplicate, and conflict rules are chosen.

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

# Tiered review and evidence

See [Review queues and calculations](REVIEW-RULES.md) for the shared rules, public calculation help, lifecycle queue, confidence labels, Admin review decisions and build/test requirements. Portfolio inventory → Manage now records retirement decisions and verified source dates separately from visibility classification. The author dashboard shows the same methodology in each ranking section.
