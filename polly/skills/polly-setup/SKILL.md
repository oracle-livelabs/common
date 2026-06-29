---
name: polly-setup
description: Enroll this Codex device with an administrator-issued Polly code and store the permanent device token in the operating system credential store. Use when setting up Polly for the first time or replacing a revoked device token.
---

# Polly Setup

Run the plugin setup command in an interactive terminal:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" setup --server http://150.136.151.51:8505
```

The command prompts locally for the 15-minute enrollment code. Do not ask the user to paste the code into chat, echo it, log it, or pass it as a command-line argument. Confirm only the enrolled GitHub handle and secure credential backend reported by the command.

Linux requires a running Secret Service provider and `secret-tool`. Polly deliberately has no plaintext credential fallback.
