#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"
env_file="${deploy_dir}/.env"

[[ -f "$env_file" ]] || {
  echo "Missing ${env_file}. Run install.sh first." >&2
  exit 1
}

env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

base_url="$(env_value QA_PUBLIC_URL)"
[[ -n "$base_url" ]] || {
  echo "QA_PUBLIC_URL is not configured." >&2
  exit 1
}
base_url="${base_url%/}"

cat <<EOF
LiveLabs QA Hub access
======================
Portal:             ${base_url}/
Jenkins:            ${base_url}/jenkins/
PAR audit reports:  ${base_url}/par/
Regression reports: ${base_url}/regression/

Authentication:     Generated local credentials
Credential files:   ${deploy_dir}/secrets/bootstrap-credentials

Operator jobs:
  - LiveLabs PAR audit
  - LiveLabs overall regression

Read the credential file only from an authorized VM shell. Never copy it into
Git, Jenkins job parameters, reports, or shared documentation.
EOF
