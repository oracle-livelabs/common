---
name: polly-share
description: Propose a coding decision, constraint, assumption, blocker, or progress note for shared Polly memory. Use when the user explicitly wants collaborators to receive a piece of project context.
---

# Polly Share

Share only the specific project fact the user intends to propose. Run from the relevant repository:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" share \
  --record-type decision \
  --scope repo_shared \
  --content "Use the canonical upstream repository as the collaboration namespace."
```

Valid record types include `decision`, `constraint`, `assumption`, `open_question`, `progress`, and `blocker`. The result is `proposed_shared`; it is not accepted team truth until an administrator reviews it.
