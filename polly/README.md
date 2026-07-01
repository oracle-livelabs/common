# Polly Codex Plugin

Polly shares authenticated developer context across developers and forks while preserving explicitly private memory. It is inactive by default in every clone. After `$polly-init` enables a clone, the plugin retrieves bounded context on `SessionStart` and `UserPromptSubmit`, then updates one rolling shared checkpoint per Codex session on `Stop`.

## Prerequisites

- Python 3.10 or newer.
- Git and a GitHub `origin` remote.
- macOS Keychain, Linux Secret Service with `secret-tool`, or Windows DPAPI.
- The Polly server URL provided out of band by the administrator.
- A one-time enrollment code issued by the Polly administrator.

## Install

```bash
codex plugin marketplace add oracle-livelabs/common --ref main --sparse .agents/plugins --sparse polly
codex plugin add polly@oracle-livelabs-common
```

The sparse paths keep Codex from cloning the full `common` repository. Existing
installations that were registered without sparse checkout can be migrated in
place without re-enrolling:

```bash
codex plugin marketplace remove oracle-livelabs-common
codex plugin marketplace add oracle-livelabs/common --ref main --sparse .agents/plugins --sparse polly
codex plugin list --marketplace oracle-livelabs-common
```

Restart Codex and start a new thread after installing or refreshing the plugin.
Codex reads the plugin manifest's `skills` path, discovers
`skills/polly-setup/SKILL.md`, and exposes its declared name as `$polly-setup`.


## Workflow

1. The administrator approves a GitHub handle and generates a 15-minute enrollment code.
2. The developer runs `$polly-setup` with the administrator-provided server URL. The URL is saved only in the developer's local Polly configuration; the permanent token is stored by the operating system and is never written to a plaintext file.
3. In a fork clone, the developer runs `$polly-init` with the upstream project, for example `oracle-livelabs/livestack`.
4. Codex hooks retrieve personal continuity plus accepted shared memory under that canonical repository.
5. Each prompt shows a Polly status message and confirms whether relevant memory was supplied. If retrieval fails, Codex says it continued without shared context.
6. Stop hooks replace one shared checkpoint for the current session and confirm when it has been shared. Collaborators receive the latest progress without accumulating one record per turn.
7. `$polly-quiet` pauses automatic checkpoints, `$polly-share`, and `$polly-private` for the current clone while keeping context retrieval active. `$polly-quiet off` resumes memory writes.
8. `$polly-private` saves a deliberate developer-only note under the canonical repository without tying it to the current Codex session. It is available as personal continuity in future sessions but is never returned to collaborators.
9. `$polly-share` immediately publishes a deliberate decision, constraint, assumption, blocker, or progress note to collaborators. The administrator can revoke developers or moderate incorrect records, but no approval queue is required.
10. `$polly-disable` stops all Polly retrieval and memory writes for the current clone without contacting the server or deleting existing memory.

If Polly is unavailable, every hook fails open so Codex continues without injected context.
The shared plugin contains no default Polly endpoint.

Polly `0.6.0` introduces strict repository opt-in. After upgrading from an older
version, restart Codex and rerun `$polly-init` once in each clone that should use
Polly. Enrollment and the securely stored device token remain valid; do not rerun
`$polly-setup`. A previous `polly.canonicalRepo` setting alone does not enable a
clone.

Polly deliberately keeps its local configuration in the same per-user directory for both skills and hooks (`~/.config/polly-codex` by default on macOS and Linux, or `%LOCALAPPDATA%\polly-codex` on Windows). Codex's hook-only `PLUGIN_DATA` directory is not used because `$polly-setup` does not run in that hook environment.
