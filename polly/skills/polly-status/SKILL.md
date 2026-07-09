---
name: polly-status
description: Diagnose Polly enrollment, repository enablement, secure token availability, canonical repository resolution, and server health. Use when Polly context is missing or setup needs verification.
---

# Polly Status

Run from the repository being diagnosed:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" status
```

Report the server health, enrolled handle, credential backend, working repository, canonical repository, resolution source, whether the repository is enabled, and whether memory sharing is disabled, active, or paused. Never inspect or print the stored device token.
