#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"
env_file="${deploy_dir}/.env"

[[ -f "$env_file" ]] || {
  echo "Missing ${env_file}. Run bash install.sh first." >&2
  exit 1
}

env_value() {
  local key="$1"
  local fallback="$2"
  local line
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    printf '%s' "$fallback"
    return
  fi
  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

base_url="$(env_value QA_PUBLIC_URL https://127.0.0.1:32443)"
base_url="${base_url%/}"
bind_address="$(env_value QA_BIND_ADDRESS 127.0.0.1)"
https_port="$(env_value QA_HTTPS_PORT 32443)"
jenkins_user="$(env_value JENKINS_ADMIN_USER qa-admin)"
report_user="$(env_value QA_REPORT_USER qa-reviewer)"

cat <<EOF
LiveLabs QA Hub access
======================
Portal:             ${base_url}/
Jenkins:            ${base_url}/jenkins/
PAR audit reports:  ${base_url}/par/
Regression reports: ${base_url}/regression/

Listening on:       ${bind_address}:${https_port}
Jenkins user:       ${jenkins_user}
Report user:        ${report_user}

Operator jobs:
  - LiveLabs PAR audit
  - LiveLabs overall regression

Connect to Oracle VPN before opening these URLs. Jenkins and report secrets are
not printed here. Newly generated values are shown once during preparation and
must be stored in the approved secret manager.
EOF
