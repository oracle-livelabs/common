# Capture Recipes

## Playwright Recipe

Use this as default for reproducible capture runs.

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="<path-to-playwright-cli>"
export SHOT_ROOT="output/screenshots/<run-name>"
mkdir -p "$SHOT_ROOT"
```

Desktop pass:

```bash
"$PWCLI" open "https://example.com" --headed
"$PWCLI" snapshot
"$PWCLI" viewport 1440 900
"$PWCLI" screenshot "$SHOT_ROOT/01-home-desktop-initial.png" --full-page
```

Mobile pass:

```bash
"$PWCLI" viewport 390 844
"$PWCLI" screenshot "$SHOT_ROOT/02-home-mobile-initial.png" --full-page
```

If login/state changes are required, capture one screenshot per key state transition and keep numbering strict (`03-...`, `04-...`).

## Chrome DevTools MCP Recipe

Use this when you need targeted element captures or runtime debugging tied to visual evidence.

1. Open page with `new_page` / `navigate_page`.
2. Find target with `take_snapshot` and capture `uid`.
3. Capture with `take_screenshot`:
   - Full-page when layout context matters.
   - Element screenshot when pixel precision of a component matters.
4. Capture supporting diagnostics when useful:
   - `list_console_messages`
   - `list_network_requests`
5. Save screenshot files into the same run folder as Playwright artifacts.

## OS-level Fallback Recipe

Use only if browser tools cannot capture the required surface.

```bash
python3 "<path-to-os-screenshot-helper>" \
  --path "output/screenshots/<run-name>/99-desktop-fallback.png"
```

Record fallback reason in `manifest.md`.
