---
name: polly-init
description: Enable Polly for the current clone or fork and configure its canonical upstream GitHub repository using local git config. Use when opting a repository into Polly or correcting fork-to-upstream memory resolution.
---

# Polly Init

From the repository root, run:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" init --canonical-repo OWNER/REPOSITORY
```

Use the upstream collaboration repository as `OWNER/REPOSITORY`, not the developer fork. The command stores `polly.canonicalRepo` and `polly.enabled=true` only in local Git config and does not create a tracked file. Polly hooks and memory commands remain inactive until this command succeeds.

For `klazarz/livestack`, use:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" init --canonical-repo oracle-livelabs/livestack
```
