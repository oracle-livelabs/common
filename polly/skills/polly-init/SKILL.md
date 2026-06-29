---
name: polly-init
description: Configure the canonical upstream GitHub repository for the current clone or fork using local git config. Use when enabling Polly in a repository or correcting fork-to-upstream memory resolution.
---

# Polly Init

From the repository root, run:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" init --canonical-repo OWNER/REPOSITORY
```

Use the upstream collaboration repository as `OWNER/REPOSITORY`, not the developer fork. The command stores `polly.canonicalRepo` only in local git config and does not create a tracked file.

For `klazarz/livestack`, use:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" init --canonical-repo oracle-livelabs/livestack
```
