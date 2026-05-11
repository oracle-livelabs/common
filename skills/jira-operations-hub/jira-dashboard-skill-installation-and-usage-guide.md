# Jira Dashboard Skill Installation And Use Guide

## What The Skill Can Do

- launch and verify the Outbound PM Operations Hub Jira dashboard
- help configure live Jira ticket fetching without exposing credentials
- diagnose dashboard startup, local server, MCP, and Jira fetch issues

## Core Rules

- redact Jira tokens, usernames, and secrets from reports
- separate local dashboard health from live Jira API health
- report exact blockers when VPN, MCP, or credentials are unavailable

## Installation Process

Give Codex this prompt:

```text
Install `jira-dashboard-skill.zip` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `jira-dashboard` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$jira-dashboard` and give Codex the target path or content.

## What To Include In Your Request

- dashboard package folder or launcher command
- desired local port if it must be fixed
- whether live Jira fetch should be tested
- sanitized Jira project filter or dashboard scope

## Recommended Prompt Patterns

### Open The Dashboard

```text
$jira-dashboard start the local dashboard, open it in a browser, and report the local URL plus health status
```

### Diagnose Empty Tickets

```text
$jira-dashboard diagnose why the dashboard loads but live Jira tickets are empty. Redact credentials in all output.
```

## Common Pitfalls

- printing Jira credentials in logs
- treating a loaded UI as proof that live Jira fetch works
- changing MCP config before checking the current server status

## Expected Output From Codex

- dashboard URL or startup blocker
- health-check evidence
- Jira fetch status when requested
- redacted configuration findings
- next manual steps when authentication is blocked

## Quick Checklist

- embedded name is `jira-dashboard`
- package ZIP exists
- credentials are redacted
- UI and Jira API status are reported separately

## Note

The existing `jira-dashboard-installation-and-usage-guide.md` is a detailed dashboard runbook and is not overwritten by this generated skill guide.

## Versioning History

- version 1.0 - 05/11/26
