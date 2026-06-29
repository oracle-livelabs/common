---
name: polly-share
description: Share a coding decision, constraint, assumption, blocker, or progress note with collaborators through Polly. Use when the user explicitly wants collaborators to receive a durable piece of project context.
---

# Polly Share

Share only the specific project fact the user intends to publish. Run from the relevant repository:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" share \
  --record-type decision \
  --scope repo_shared \
  --content "Use the canonical upstream repository as the collaboration namespace."
```

Valid record types include `decision`, `constraint`, `assumption`, `open_question`, `progress`, and `blocker`. Approved developers publish directly to accepted shared memory; administrators retain moderation and developer-revocation controls.

If repository-local quiet mode is active, do not bypass it. Tell the user to run `$polly-quiet off` before publishing memory.
