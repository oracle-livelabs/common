---
name: polly-disable
description: Disable Polly retrieval and memory writes for the current local Git clone while preserving its canonical repository and quiet-mode settings. Use when a repository should no longer participate in Polly or was enabled unintentionally.
---

# Polly Disable

From the repository to disable, run:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" disable
```

Confirm that Polly reports the clone as disabled. The command stores
`polly.enabled=false` in local Git config, does not contact the Polly server,
and does not delete existing memory. Re-enable the clone with `$polly-init`.
