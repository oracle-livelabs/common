# Polly Codex Plugin

Polly shares reviewed coding context across developers and forks while keeping each developer's private continuity isolated. The plugin retrieves bounded context on `SessionStart` and `UserPromptSubmit`, then updates one rolling private checkpoint per Codex session on `Stop`.

## Prerequisites

- Python 3.10 or newer.
- Git and a GitHub `origin` remote.
- macOS Keychain, Linux Secret Service with `secret-tool`, or Windows DPAPI.
- A one-time enrollment code issued by the Polly administrator.


## Workflow

1. The administrator approves a GitHub handle and generates a 15-minute enrollment code.
2. The developer runs `$polly-setup`. The permanent token is stored by the operating system and is never written to a plaintext file.
3. In a fork clone, the developer runs `$polly-init` with the upstream project, for example `oracle-livelabs/livestack`.
4. Codex hooks retrieve personal continuity plus accepted shared memory under that canonical repository.
5. Stop hooks replace one private checkpoint for the current session. They do not end the session or publish every turn.
6. `$polly-share` creates a proposed record. An administrator must accept it before other developers receive it as trusted shared context.

If Polly is unavailable, every hook fails open so Codex continues without injected context.
