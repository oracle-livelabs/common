#!/usr/bin/env bash
set -euo pipefail

CURRENT_VERSION="26.5.2"
ARCHIVE_VERSION="26.5"

usage() {
  cat <<'USAGE'
Usage:
  setup_or_upgrade_skill.sh

Marks this skill as version 26.5.2, scans the skills directory for older
LiveLabs author skills, and asks whether to archive them as 26.5.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SKILLS_ROOT="$(cd "${SKILL_DIR}/.." && pwd)"
CURRENT_NAME="$(basename "${SKILL_DIR}")"
VERSION_FILE="${SKILL_DIR}/VERSION"

printf '%s\n' "${CURRENT_VERSION}" > "${VERSION_FILE}"
echo "Configured ${CURRENT_NAME} as version ${CURRENT_VERSION}."

find_candidates() {
  local dir base
  for dir in "${SKILLS_ROOT}"/livelabs-workshop-author*; do
    [[ -d "${dir}" ]] || continue
    [[ "${dir}" == "${SKILL_DIR}" ]] && continue
    base="$(basename "${dir}")"
    [[ "${base}" == *"-archived"* ]] && continue
    printf '%s\n' "${dir}"
  done
}

CANDIDATES=()
while IFS= read -r candidate; do
  CANDIDATES+=("${candidate}")
done < <(find_candidates)

if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
  echo "No older LiveLabs author skill installs found."
  exit 0
fi

echo "Found older LiveLabs author skill installs:"
for candidate in "${CANDIDATES[@]}"; do
  echo "  - ${candidate}"
done

if [[ ! -t 0 ]]; then
  echo "Non-interactive shell detected. Keeping older installs in place."
  exit 0
fi

printf 'Archive and rename these older installs as %s? [y/N] ' "${ARCHIVE_VERSION}"
read -r REPLY

case "${REPLY}" in
  y|Y|yes|YES)
    ;;
  *)
    echo "Keeping older installs in place."
    exit 0
    ;;
esac

timestamp="$(date '+%Y%m%d-%H%M%S')"

for candidate in "${CANDIDATES[@]}"; do
  base="$(basename "${candidate}")"
  target="${SKILLS_ROOT}/${base}-${ARCHIVE_VERSION}-archived-${timestamp}"
  if [[ -e "${target}" ]]; then
    target="${target}-$$"
  fi
  mv "${candidate}" "${target}"
  echo "Archived ${candidate} -> ${target}"
done

echo "Using ${CURRENT_NAME} version ${CURRENT_VERSION} moving forward."
