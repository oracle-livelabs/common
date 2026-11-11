# Outbound PM Operations Hub

A shared operating hub for visibility, ownership, open decisions, support needs, and AI-assisted follow-through across Outbound PM initiatives.

Originally created by **Pat Shepherd** and adapted from the JiraPat dashboard. Updated and expanded for Outbound PM by **Mary Hess**.

## About

- Original creator: Pat Shepherd
- Updated and expanded by: Mary Hess
- Current focus: Outbound PM operating visibility and AI-assisted follow-through

It runs in your browser and fetches live data through the **Jira MCP server** (`mcp-atlassian`) configured in `~/.codex/config.toml`.

## Prerequisite (required)

This dashboard depends on the Jira MCP server named `mcp-atlassian`. Do not assume users have access to Confluence or any internal setup page; the required setup is summarized here.

In your Codex config file, confirm there is an `mcp_servers.mcp-atlassian` entry and that it has Jira connection values available to the MCP process. Typical config locations are:

- macOS/Linux: `~/.codex/config.toml`
- Windows: the Codex config file in your user home `.codex` folder

The exact command can vary by team installation, but the entry must provide the Jira URL, username, API token, and project filter. Example shape:

```toml
[mcp_servers.mcp-atlassian]
command = "<your mcp-atlassian launch command>"
args = ["<your mcp-atlassian args if required>"]

[mcp_servers.mcp-atlassian.env]
JIRA_URL = "https://jira.oraclecorp.com"
JIRA_USERNAME = "your.email@example.com"
JIRA_API_TOKEN = "your-token"
JIRA_PROJECTS_FILTER = "LLAPEX,LDA,SEE,DOPP"
```

After changing `config.toml`, restart Codex or the terminal session so the MCP server is reloaded. Without this setup, data loading, reports, and ticket creation will fail.

## Installation requirements

### macOS requirements

1. Connect to corporate VPN (required for Jira access).
2. Install Python 3.11+ (3.14 tested): https://www.python.org/downloads/macos/
3. Verify Python in Terminal:

   ```bash
   python3 --version
   ```

4. Confirm Codex is installed and `mcp-atlassian` is configured in:

   - `~/.codex/config.toml`

5. Ensure your Jira account has access to the target projects (for example, `LDA`, `LLAPEX`, `DOPP`).

### Windows requirements (Jira project setup)

1. Connect to corporate VPN (required for Jira access).
2. Install Python 3.11+ (3.14 tested): https://www.python.org/downloads/windows/
3. In the Python installer, enable **Add python.exe to PATH**.
4. Verify Python in PowerShell:

   ```powershell
   py --version
   ```

5. Confirm Codex is installed and Jira MCP is configured in your Codex config file.

6. In that file, confirm there is an `mcp_servers.mcp-atlassian` entry with Jira environment values (for example `JIRA_URL`, `JIRA_USERNAME`, `JIRA_API_TOKEN`) and the project filter used by this dashboard (`JIRA_PROJECTS_FILTER=LLAPEX,LDA,SEE,DOPP`).
7. Restart your terminal/Codex session after updating config so MCP is reloaded.
8. Ensure your Jira account has access to the target projects (for example, `LDA`, `LLAPEX`, `DOPP`).

### Shared requirements

- A local browser that can reach `http://127.0.0.1:<port>`.
- The selected local port (default `8765`) must be available.
- You can ask Codex to install Python 3.14 for you. Example prompt:

  ```text
  Install Python 3.14 on this machine and verify it by running: python3 --version
  ```

## What this includes

- `index.html` - single-page dashboard UI with **Dashboard**, **Status Draft**, **Insights**, and **Add Work Item** tabs
- `server.py` - local Python bridge from browser -> Jira MCP (stdio)
- `run_dashboard.sh` - launcher script
- `JiraPat-infographic-v11.svg` - one-page capability infographic
- `JiraPat-server-shim-flow-v11.svg` - architecture and data-flow diagram

## Run

### macOS/Linux

From this folder:

```bash
./run_dashboard.sh
```

Custom port:

```bash
./run_dashboard.sh 8899
```

Show insecure-warning output:

```bash
./run_dashboard.sh 8765 --no-suppress-insecure-warning
```

### Windows (PowerShell)

From this folder:

```powershell
py -3 .\server.py --host 127.0.0.1 --port 8765 --suppress-insecure-warning
```

Custom port:

```powershell
py -3 .\server.py --host 127.0.0.1 --port 8899 --suppress-insecure-warning
```

Show insecure-warning output:

```powershell
py -3 .\server.py --host 127.0.0.1 --port 8765 --no-suppress-insecure-warning
```

Then open:

- http://127.0.0.1:8765

## How to use

- **Team Members**: comma-separated emails (optional)
  - Leave blank to include all assignees in selected projects.
- **Projects**: comma-separated project keys (defaults to `LLAPEX,LDA,SEE,DOPP`).
- **Include closed work items**: toggle on/off. When off, only work items with status `Closed` are excluded; `Resolved` items remain visible.
- **Custom JQL**: optional full override query.
- **Refresh**: fetch latest tickets.
- **Connection Status**: validates Jira bridge connectivity.

### Dashboard tab

- Interactive sprint ticket table
- One-click saved views:
  - All Work
  - High Priority
  - Blocked / On Hold
  - In Progress
  - Needs Attention
  - Due in 7 Days
- Priority Actions sidebar that highlights top action tickets based on risk, priority, staleness, due dates, and ownership gaps.
- One-click action views for My Blockers, Waiting on Me, Unestimated Work, Stale Work, and No Owner.
- Browser-persisted workspace settings for projects, filters, search, sort, custom JQL, and saved view.
- Cached first paint so the last matching ticket set appears immediately while Jira refreshes in the background.
- Delta refresh on focus return so recently changed issues are merged without reloading the full sprint every time.
- Team Actions to copy filtered links, copy a triage summary, or open the top filtered tickets.
- Diagnostics panel showing load time, cache hit/miss, report timing, browser-cache age, and last Jira fetch.
- Export CSV button for the currently filtered ticket scope.

### Status Draft tab

- One-click status draft generator using the current Dashboard filters and saved view.
- Draft sections for Yesterday, Today, Blockers, and Risks.
- Copy to Clipboard button for fast posting into team channels or operating reviews.

### Insights tab

- **Assignee workload heatmap**
- **Burndown trend** (computed from issue status history via `jira_get_issue_dates`)
- **Priority mix by assignee**
- **Due date risk**
- **Estimate load by assignee**
- **Label hotspots**
- Background insight prefetch after ticket load so the Insights tab is usually ready when opened.
- Jira IDs shown in report rows (for example Due Date Risk) are clickable and open the issue in Jira.

### Add Work Item tab

- Create a Jira issue with core fields:
  - Project, Issue Type, Priority, Summary, Description
  - Assignee + Reporter dropdowns (team members inferred from recent sprint activity)
  - Sprint dropdown (defaults to current sprint, with previous/next sprint options when available)
  - Estimated hours
  - Labels (multi-select)

## Notes

- This uses your existing Jira auth from `~/.codex/config.toml` (`mcp-atlassian` env values).
- No external Python dependencies are required (Python 3.11+ recommended, tested with 3.14).

## Revision notes

> Maintain this section for all future releases.  
> For each new version, add a new top entry with: version, date, and concise change summary.

- **v13-operating-hub (2026-05-06)**
  - Refactored the dashboard vocabulary from a Jira power-user interface into a leadership-ready team operating hub.
  - Added configurable initiative mapping and quick views for LiveLabs AI, Customer Outreach, SE Enablement, HOL Events, Cross-team Ops, and Other Programs.
  - Renamed UI sections: Connection Status, Team Actions, Insights, Add Work Item, Status Draft, and Priority Actions.
  - Added Open Decisions, Ownership Summary, Codex Actions, and milestone/readiness cards.
  - Preserved existing ticket loading, filtering, CSV export, status draft, insights, and add-work-item functionality.

- **v12-leadership-summary (2026-05-06)**
  - Created a separate leadership iteration folder so the v11 improved copy remains unchanged.
  - Added a Leadership Summary section above the metric cards.
  - Derived overall health from blocked tickets, overdue tickets, stale tickets, and unassigned open tickets.
  - Added top 3 lists for risks, blockers, decisions needed, and items without owners.
  - Removed the default `assignee is not EMPTY` query clause so unassigned tickets can surface in leadership ownership gaps.

- **v11-outbound-pm-ops (2026-05-06)**
  - Renamed the leadership-facing copy to **Outbound PM Operations Dashboard**.
  - Added an executive-ready description for team-wide execution, visibility, and coordination.
  - Added visible author credit for Pat Shepherd.
  - Added `SEE` to the default project scope.
  - Changed the default exclusion from Jira `statusCategory != Done` to exact `status != Closed`, so `Resolved` tickets remain in the dashboard unless filtered in the UI.

- **v11 (2026-05-05)**
  - Added cached first paint from browser storage, followed by a background Jira refresh.
  - Added background report prefetch after ticket loads so Reports is ready faster.
  - Added persisted personal workspace settings for projects, filters, custom JQL, saved view, sort, search, and labels.
  - Added one-click action views: My Blockers, Waiting on Me, Unestimated, Stale Tickets, and No Assignee.
  - Added delta refresh support for focus-return refreshes using `updated_since` and merging changed tickets into the current result set.
  - Added Bulk Triage actions for copying filtered Jira links, copying a triage summary, and opening the top filtered tickets.
  - Added a Diagnostics panel with ticket/report timing and cache hit/miss details.
  - Replaced the Confluence-dependent prerequisite with self-contained Jira MCP setup guidance.
  - Bumped app version defaults to `v11` in UI (`index.html`) and server (`server.py`).
  - Added distribution package `JiraPat-dashboard-distribution-v11.zip`.

- **v10 (2026-04-20)**
  - Bumped app version defaults to `v10` in UI (`index.html`) and server (`server.py`) for the current distribution build.
  - Added refreshed release visuals (`JiraPat-infographic-v10.svg`, `JiraPat-server-shim-flow-v10.svg`) for deployment packaging.
  - Added distribution package `JiraPat-dashboard-distribution-v10.zip`.

- **v9 (2026-04-20)**
  - Added a new **Standup** tab with one-click draft generation (Yesterday / Today / Blockers / Risks) based on current Dashboard scope.
  - Added **Copy to Clipboard** action for standup drafts.
  - Added **Needs Attention** saved view to quickly isolate risk-heavy tickets.
  - Added **Focus Queue** panel in Dashboard sidebar to prioritize action items using score-based urgency signals (priority, blocked state, due risk, stale updates, missing estimate).
  - Added **Export CSV** from Dashboard for the current filtered issue set.
  - Bumped app version defaults to `v9` in UI (`index.html`) and server (`server.py`).
  - Added distribution package `JiraPat-dashboard-distribution-v9.zip`.

- **v8 (2026-04-20)**
  - Clarified installation guidance by splitting requirements into dedicated macOS and Windows sections.
  - Expanded the Windows section with Jira project setup requirements, including MCP config checks in the user's Codex config file and `JIRA_PROJECTS_FILTER=LDA,LLAPEX,DOPP`.
  - Added explicit Windows PowerShell run commands (`py -3 .\server.py ...`) alongside the existing macOS/Linux launcher flow.
  - Bumped app version defaults to `v8` in both UI (`index.html`) and server (`server.py`).
  - Added refreshed release visuals (`JiraPat-infographic-v8.svg`, `JiraPat-server-shim-flow-v8.svg`) for deployment packaging.

- **v7 (2026-04-09)**
  - Ticket Distribution by Assignee now supports toggle behavior: click a name once to filter, click it again to clear and show all assignees.
  - Intro walkthrough now waits for ticket data to load before starting so demo steps have live context.
  - Intro walkthrough now includes the new assignee-bar toggle behavior.
  - While walkthrough steps that depend on reports are active, the demo pauses and shows `Reports loading. Please wait...` until report data is ready.
  - Bumped app version defaults to `v7` in both UI (`index.html`) and server (`server.py`).
  - Updated release packaging artifacts to `v7`, including refreshed image files (`JiraPat-infographic-v7.svg`, `JiraPat-server-shim-flow-v7.svg`) and distribution zip naming.

- **v6 (2026-04-09)**
  - Jira IDs in report rows (including Due Date Risk) now open the matching Jira ticket directly.
  - Added startup flag `--suppress-insecure-warning` (default: enabled).
  - Added support for `--no-suppress-insecure-warning` to show warning output when needed.
  - With suppression enabled, hides `InsecureRequestWarning` and `WARNING - mcp-atlassian - Jira SSL verification disabled` lines.
  - Added safe short-lived server-side caches for ticket search, reports, issue-history lookups, and create-ticket metadata to reduce repeated MCP/Jira calls.
  - Cache TTLs are configurable via env vars: `JIRAPAT_SEARCH_CACHE_TTL_SECONDS`, `JIRAPAT_REPORTS_CACHE_TTL_SECONDS`, `JIRAPAT_HISTORY_CACHE_TTL_SECONDS`, `JIRAPAT_CREATE_META_CACHE_TTL_SECONDS`.

- **v5 (2026-04-08)**
  - Dashboard now auto-refreshes when you return to the Dashboard tab from another app tab.
  - Dashboard also auto-refreshes when browser focus returns to the page while Dashboard is active.
  - Added a short debounce/cooldown to prevent duplicate refreshes from rapid focus events.
  - Added persisted installed-version tracking (`v5`) in browser storage alongside intro-tour preferences.
  - Added background update checks against the configured SharePoint distribution folder and prompt to download/install when a newer version is detected.

- **v4 (2026-04-08)**
  - Added `DOPP` to default projects (`LDA,LLAPEX,DOPP`) in UI and server defaults.

- **v3 (2026-04-08)**
  - Added animated intro walkthrough with spotlight overlay and guided feature tour.
  - Added `Do not show intro again` preference persisted in browser storage.
  - Added `Show Intro` button to replay the walkthrough.

- **v2 (2026-04-08)**
  - Added Labels column to quick search table with clickable color chips.
  - Added multi-select label filtering with `All` and `Clear selections`.
  - Added richer reports and report auto-load on Reports tab selection.

- **v1 (2026-04-07)**
  - Initial JiraPat dashboard release (Dashboard, Reports, Create Ticket, MCP bridge).

## Troubleshooting

If requests fail:

1. Ensure you are connected to corporate VPN.
2. Restart your Codex session/terminal so the MCP environment is fresh.
3. Click **Connection Status** in the UI for a direct connectivity check.

## Versioning History

- version 11.0 - 05/11/26
