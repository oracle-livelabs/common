#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"

if [[ ! -f "${deploy_dir}/.env" || ! -s "${deploy_dir}/secrets/jenkins-admin-secret" ]]; then
  "${script_dir}/prepare.sh" "${1:-}"
fi

"${script_dir}/compose.sh" up -d --build
"${script_dir}/healthcheck.sh"