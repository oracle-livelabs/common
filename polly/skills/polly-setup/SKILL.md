---
name: polly-setup
description: Enroll this Codex device with an administrator-issued Polly code and store the permanent device token in the operating system credential store. Use when setting up Polly for the first time or replacing a revoked device token.
---

# Polly Setup

Obtain the Polly server URL and a one-time enrollment code from the administrator. The
server URL is required and must not be inferred from plugin files.

Run the plugin setup command in an interactive terminal:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" setup --server "<administrator-provided-polly-url>"
```

The command prompts locally for the 15-minute enrollment code. Do not ask the user to paste the code into chat, echo it, log it, or pass it as a command-line argument. Confirm only the enrolled GitHub handle and secure credential backend reported by the command.

The server URL and GitHub handle are saved only in the developer's local Polly
configuration. The permanent device token remains in the operating system credential
store.

Linux requires a running Secret Service provider and `secret-tool`. Polly deliberately has no plaintext credential fallback.
