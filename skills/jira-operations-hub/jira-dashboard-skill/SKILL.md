---
name: jira-dashboard
description: Launch, install, verify, or help operate the Outbound PM Operations Hub Jira dashboard. Use when the user asks to open the Jira dashboard, start the dashboard, fix live ticket fetching, share or install the dashboard package, or work with the Outbound PM operating hub.
---

# Jira Dashboard

## Required Launch Rule

Always launch the dashboard through the local Python server before telling the user it is ready. Never direct users to open `index.html` with a `file://` URL, because live Jira fetching requires the local server API.

Run:

```bash
python3 "$HOME/.codex/skills/jira-dashboard/scripts/launch_dashboard.py"
```

The launcher:
- Installs the bundled dashboard into `~/Documents/Codex` if it is missing.
- Starts or reuses a local server on `localhost`, preferring port `8901`.
- Opens the browser to the correct `http://localhost:<port>/` URL.
- Prints the dashboard URL, dashboard folder, and log path.

## Workflow

1. Run `scripts/launch_dashboard.py` every time this skill is used for opening or troubleshooting the dashboard.
2. Use the printed `http://localhost:<port>/` URL for all browser checks.
3. If the user is on a `file://.../index.html` URL, move them to the printed localhost URL.
4. If ticket fetching fails after the dashboard loads, check VPN and the Jira MCP server named `mcp-atlassian` in `~/.codex/config.toml`.
5. If the server starts but the page is stale, ask the user to hard refresh the localhost URL.

## Dashboard Package

The bundled dashboard zip lives at:

```text
assets/OutboundPM-operations-dashboard-v13-operating-hub.zip
```

The default installed folder is:

```text
~/Documents/Codex/OutboundPM-operations-dashboard-v13-operating-hub
```

If a user asks to share the dashboard with teammates, share the full `jira-dashboard` skill folder or the packaged skill zip. Teammates still need their own Jira MCP credentials and VPN access for live Jira data.
