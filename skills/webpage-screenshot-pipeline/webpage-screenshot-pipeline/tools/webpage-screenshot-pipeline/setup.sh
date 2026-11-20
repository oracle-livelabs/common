#!/usr/bin/env bash
set -euo pipefail
CHANNEL="${1:-chromium}"
case "$CHANNEL" in chromium|chrome|msedge) ;; *) echo 'Usage: setup.sh [chromium|chrome|msedge]' >&2; exit 2 ;; esac
TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
command -v node >/dev/null 2>&1 || { echo 'Node.js is required. Install Node.js, then rerun setup.sh.' >&2; exit 2; }
command -v npm >/dev/null 2>&1 || { echo 'npm is required. Install npm with Node.js, then rerun setup.sh.' >&2; exit 2; }
cd "$TOOL_ROOT"
export npm_config_cache="$TOOL_ROOT/.npm-cache"
npm install --ignore-scripts --no-audit --no-fund
if [[ "$CHANNEL" == "chromium" ]]; then
  npx playwright install chromium
else
  echo "Skipping Playwright browser download; capture will use installed $CHANNEL."
fi
echo "Playwright setup complete under $TOOL_ROOT"
