#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  create_traceability_stub.sh <workshop-root>

Creates a TRACEABILITY.md starter file when one does not already exist.
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
TRACEABILITY_PATH="${WORKSHOP_ROOT%/}/TRACEABILITY.md"

if [[ ! -d "${WORKSHOP_ROOT}" ]]; then
  echo "Workshop root not found: ${WORKSHOP_ROOT}"
  exit 1
fi

if [[ -f "${TRACEABILITY_PATH}" ]]; then
  echo "Traceability file already exists: ${TRACEABILITY_PATH}"
  exit 0
fi

cat > "${TRACEABILITY_PATH}" <<'EOF'
# Traceability Summary

Estimated Time: 5 minutes

| Workshop Area | Source | Evidence Type | Notes |
| --- | --- | --- | --- |
| Introduction | TODO | claim | Add the primary source for the scenario and outcomes |
| Lab 1 | TODO | command | Track the source for setup commands and prerequisites |
| Lab 2 | TODO | claim | Track the source for architecture or workflow explanations |
| Lab 3 | TODO | result | Track the source for checkpoints, outputs, or validations |

## Notes

- Record any source gaps, substitutions, or recreated local assets here.
- Keep remote asset failures and fallback choices explicit.

## Acknowledgements

* **Traceability Compiled By** - TODO
* **Last Updated By/Date** - TODO
EOF

echo "Created traceability stub: ${TRACEABILITY_PATH}"
