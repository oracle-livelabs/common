#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  run_workshop_qa.sh <workshop-root> [--files <relative-md-path> ...]

Runs the local workshop validator when available and prints the report path.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

WORKSHOP_ROOT="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
shift
VALIDATE_FILES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --files)
      shift
      while [[ $# -gt 0 ]]; do
        if [[ "$1" == --* ]]; then
          break
        fi
        VALIDATE_FILES+=("$1")
        shift
      done
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

resolve_validator() {
  local candidates=(
    "${SCRIPT_DIR}/validate_workshop.py"
  )
  local candidate

  for candidate in "${candidates[@]}"; do
    if [[ -f "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done

  return 1
}

if [[ ! -d "${WORKSHOP_ROOT}" ]]; then
  echo "Workshop root not found: ${WORKSHOP_ROOT}"
  exit 1
fi

if [[ -n "${WORKSHOP_VALIDATOR:-}" ]]; then
  VALIDATOR="${WORKSHOP_VALIDATOR}"
else
  VALIDATOR="$(resolve_validator || true)"
fi

if [[ ! -f "${VALIDATOR}" ]]; then
  echo "Validator not found."
  echo "Expected a bundled validator at: ${SCRIPT_DIR}/validate_workshop.py"
  echo "Set WORKSHOP_VALIDATOR to the correct validate_workshop.py path."
  exit 1
fi

if [[ ${#VALIDATE_FILES[@]} -gt 0 ]]; then
  python3 "${VALIDATOR}" "${WORKSHOP_ROOT}" --files "${VALIDATE_FILES[@]}"
else
  python3 "${VALIDATOR}" "${WORKSHOP_ROOT}"
fi

REPORT_PATH="${WORKSHOP_ROOT%/}/VALIDATION-RESULT.md"
if [[ -f "${REPORT_PATH}" ]]; then
  echo "Validation report: ${REPORT_PATH}"
else
  echo "Validator completed, but report was not found at: ${REPORT_PATH}"
  exit 1
fi
