# Admin consistency review — November 8, 2026

The Admin interface now has one navigation source and a shared responsive shell.
Scope: sign-in, Dashboard management, all three Data governance tabs, Data merge,
Portfolio inventory, Jenkins report history, saved reports and retest lists.

## Findings and changes

- Banners inherited a 270px minimum height and a column layout from public dashboard styling. Authenticated pages now use compact, left-aligned headers with consistent gutters, title sizes and a 4px accent strip. Sign-in follows the same compact header style without a sidebar.
- A final CSS rule set all tag-section headings white, including Data merge headings on pale panels. Heading colors are now explicitly readable in content panels.
- Five copied menus drifted in order and in the Account/Users settings label. `admin_shell.py` renders one alphabetical menu: Dashboard management, Data governance, Data merge, Jenkins reports, Portfolio inventory. The sidebar contains one dashboard return link and Sign out. Mobile navigation uses a native disclosure.
- Jenkins opened a standalone renderer document. The service now adds the same navigation shell to its HTML response, including retest pages and direct report links. Original report files, scripts, IDs and relative evidence/download links are preserved. Responses retain authentication, CSP script hashes and compression.
- Users settings is unavailable in navigation and delivery packages. Its old route redirects to Dashboard management; the old script is not served. Password configuration remains available through the interactive service command.
- Tag forms fit within their cards; assignments use the available neighboring column. Merge empty states no longer reserve a large blank area. Content cards, tabs and form spacing share the same page rhythm. Wide inventory tables scroll inside their container and keep readable title columns.
- Governance requested an empty snapshot ID when its history was empty. It now displays instructions and disables snapshot-dependent actions until a snapshot is available. A stale link to a removed public replacement view was removed.

## Validation

Authenticated browser checks use a disposable service/database and a generated test account.
They cover all Admin routes at 1440px and 390px, navigation order and active state,
compact header geometry, page overflow, governance tabs, empty snapshot history,
Jenkins filtering and retest/history navigation, retired settings redirects, and sign-out.
The existing full saved Jenkins report was also copied into the disposable archive for
read-only checks of P1 filters and expanded findings at both widths.

Screenshots: `output/screenshots/admin-consistency-20261108/`.
No credentials, source snapshots, applied merges or archived report files were changed.
The local service was restarted. Deployment and refreshed source inputs remain pending.

## Objectives

Summarize the Admin consistency findings and desktop and mobile review checks.

## Estimated Time

Estimated Time: About 5 minutes to review this findings summary.

## Acknowledgements

Screenshots use synthetic review data and a disposable local test service; no user credentials, snapshots, merges, or reports were changed.
