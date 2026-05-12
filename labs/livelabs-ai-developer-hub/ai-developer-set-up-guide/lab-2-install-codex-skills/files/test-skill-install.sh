#!/usr/bin/env bash
set -euo pipefail
SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
echo "Checking skills in: ${SKILLS_DIR}"
for skill in livelabs-author livestacks-orchestrator imagegen; do
  if [ -f "${SKILLS_DIR}/${skill}/SKILL.md" ] || [ -f "${SKILLS_DIR}/.system/${skill}/SKILL.md" ]; then
    echo "OK: ${skill}"
  else
    echo "MISSING: ${skill}"
  fi
done
