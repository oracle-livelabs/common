---
name: polly-private
description: Save a durable developer-only project memory in Polly without tying it to the current Codex session or sharing it with collaborators. Use when the user wants a personal decision, hypothesis, reminder, preference, or continuity note available in future sessions for the same canonical repository.
---

# Polly Private

Save only the specific project fact the user wants Polly to remember privately. Run from the relevant repository:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" private \
  --record-type observation \
  --content "Prefer the local mock server when debugging this repository."
```

Choose `decision`, `constraint`, `assumption`, `open_question`, `progress`, `blocker`, or `observation` as the record type. The bridge fixes the scope to `developer_private`, omits the Codex session ID, and stores the record only for the enrolled developer under the canonical repository.

Do not store credentials, tokens, or other secrets. Polly private memory is isolated from collaborators during retrieval, but Polly administrators can inspect database records.

If repository-local quiet mode is active, do not bypass it. Tell the user to run `$polly-quiet off` before saving memory. Report the returned memory ID and state that it will be available only to the requesting developer in future sessions for the same canonical repository.
