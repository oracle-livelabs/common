#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"

[[ -f "${deploy_dir}/.env" ]] || {
  echo "Missing ${deploy_dir}/.env. Run install.sh with the approved internal configuration." >&2
  exit 1
}

"${script_dir}/prepare.sh"
"${script_dir}/compose.sh" up -d --build
"${script_dir}/healthcheck.sh"
