#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  smoke_test_preview.sh <workshop-root> [variant]

Checks that the generated LiveLabs entry page and manifest look preview-ready.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

WORKSHOP_ROOT="$1"
VARIANT="${2:-sandbox}"
INDEX_HTML="${WORKSHOP_ROOT%/}/workshops/${VARIANT}/index.html"
MANIFEST_JSON="${WORKSHOP_ROOT%/}/workshops/${VARIANT}/manifest.json"

if [[ ! -f "${INDEX_HTML}" ]]; then
  echo "Missing index.html: ${INDEX_HTML}"
  exit 1
fi

if [[ ! -f "${MANIFEST_JSON}" ]]; then
  echo "Missing manifest.json: ${MANIFEST_JSON}"
  exit 1
fi

if ! grep -q 'main.min.js' "${INDEX_HTML}"; then
  echo "Preview smoke test failed: ${INDEX_HTML} is missing the LiveLabs loader script."
  exit 1
fi

if grep -q 'LiveLabs workshop scaffold' "${INDEX_HTML}"; then
  echo "Preview smoke test failed: ${INDEX_HTML} still contains scaffold placeholder text."
  exit 1
fi

if ! grep -q '"../../introduction/introduction.md"' "${MANIFEST_JSON}"; then
  echo "Preview smoke test failed: ${MANIFEST_JSON} is missing the introduction markdown entry."
  exit 1
fi

echo "Preview smoke test passed for ${VARIANT}: ${INDEX_HTML}"
