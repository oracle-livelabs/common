#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  create_workshop_details_stub.sh <workshop-root>

Creates a WORKSHOP-DETAILS.md starter file when one does not already exist.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

WORKSHOP_ROOT="$1"
DETAILS_PATH="${WORKSHOP_ROOT%/}/WORKSHOP-DETAILS.md"

if [[ ! -d "${WORKSHOP_ROOT}" ]]; then
  echo "Workshop root not found: ${WORKSHOP_ROOT}"
  exit 1
fi

if [[ -f "${DETAILS_PATH}" ]]; then
  echo "Workshop details file already exists: ${DETAILS_PATH}"
  exit 0
fi

cat > "${DETAILS_PATH}" <<'EOF'
# Workshop Details

## Short Description

TODO: Write a 1-2 sentence summary for catalog or listing use.

## Long Description

TODO: Write a fuller 1-3 paragraph description that explains the learner problem, scope, and outcome.

## Workshop Outline

1. Introduction
2. Lab 1 - TODO
3. Lab 2 - TODO
4. Lab 3 - TODO

## Workshop Prerequisites

- TODO

## Notes

- Keep this file aligned with the final manifest and lab titles.
- Keep the long description learner-focused. Do not say the workshop was created from a blog, prompt, or source format.
EOF

echo "Created workshop details stub: ${DETAILS_PATH}"
