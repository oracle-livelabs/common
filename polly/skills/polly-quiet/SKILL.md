---
name: polly-quiet
description: Pause, resume, or inspect Polly memory writes for the current git repository while keeping context retrieval active. Use before test prompts, experiments, sensitive exploratory work, or any session whose checkpoints and manual memories must not be stored.
---

# Polly Quiet

Enable quiet mode for the current repository when no mode is specified:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" quiet on
```

Resume automatic and manual memory writes:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" quiet off
```

Inspect the current state:

```bash
python3 "$PLUGIN_ROOT/scripts/polly_bridge.py" quiet status
```

Quiet mode is stored in local git config as `polly.quiet`, so it applies only to the current clone and is never committed. It blocks Stop checkpoints, `$polly-share`, and `$polly-private`; it does not block context retrieval. Report the resulting mode to the user and never bypass quiet mode implicitly.
