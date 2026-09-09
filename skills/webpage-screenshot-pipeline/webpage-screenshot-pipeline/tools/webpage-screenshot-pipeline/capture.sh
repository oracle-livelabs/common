#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 2 ]]; then echo 'Usage: capture.sh <url> <output-path> [width] [height] [full-page]' >&2; exit 2; fi
TOOL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -d "$TOOL_ROOT/node_modules/playwright" ]] || { echo "Playwright is not installed under $TOOL_ROOT. Run: bash $TOOL_ROOT/setup.sh" >&2; exit 2; }
command -v node >/dev/null 2>&1 || { echo 'Node.js is required to run the local Playwright capture.' >&2; exit 2; }
node "$TOOL_ROOT/capture.mjs" "$1" "$2" "${3:-1440}" "${4:-900}" "${5:-false}" "${6:-chromium}"
