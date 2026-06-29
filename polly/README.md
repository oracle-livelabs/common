# Polly Codex Plugin

Polly shares authenticated developer context across developers and forks while preserving explicitly private memory. The plugin retrieves bounded context on `SessionStart` and `UserPromptSubmit`, then updates one rolling shared checkpoint per Codex session on `Stop`.

## Prerequisites

- Python 3.10 or newer.
- Git and a GitHub `origin` remote.
- macOS Keychain, Linux Secret Service with `secret-tool`, or Windows DPAPI.
- The Polly server URL provided out of band by the administrator.
- A one-time enrollment code issued by the Polly administrator.

## Install

```bash
codex plugin marketplace add oracle-livelabs/common --ref main
codex plugin add polly@oracle-livelabs-common
```

Start a new Codex thread after installation. Codex reads the plugin manifest's `skills` path, discovers `skills/polly-setup/SKILL.md`, and exposes its declared name as `$polly-setup`.


## Workflow

1. The administrator approves a GitHub handle and generates a 15-minute enrollment code.
2. The developer runs `$polly-setup` with the administrator-provided server URL. The URL is saved only in the developer's local Polly configuration; the permanent token is stored by the operating system and is never written to a plaintext file.
3. In a fork clone, the developer runs `$polly-init` with the upstream project, for example `oracle-livelabs/livestack`.
4. Codex hooks retrieve personal continuity plus accepted shared memory under that canonical repository.
5. Each prompt shows a Polly status message and confirms whether relevant memory was supplied. If retrieval fails, Codex says it continued without shared context.
6. Stop hooks replace one shared checkpoint for the current session and confirm when it has been shared. Collaborators receive the latest progress without accumulating one record per turn.
7. `$polly-share` immediately publishes a deliberate decision, constraint, assumption, blocker, or progress note to collaborators. The administrator can revoke developers or moderate incorrect records, but no approval queue is required.

If Polly is unavailable, every hook fails open so Codex continues without injected context.
The shared plugin contains no default Polly endpoint.
