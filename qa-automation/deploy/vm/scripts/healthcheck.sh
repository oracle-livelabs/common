#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"
env_file="${deploy_dir}/.env"

value_from_env() {
  local key="$1"
  local fallback="$2"
  local line
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  [[ -n "$line" ]] && printf '%s' "${line#*=}" || printf '%s' "$fallback"
}

bind_address="$(value_from_env QA_BIND_ADDRESS 127.0.0.1)"
https_port="$(value_from_env QA_HTTPS_PORT 32443)"
base_url="https://${bind_address}:${https_port}"

for attempt in $(seq 1 30); do
  if curl --insecure --fail --silent "${base_url}/healthz" >/dev/null; then
    echo "LiveLabs QA portal is ready at ${base_url}/"
    exit 0
  fi
  sleep 5
done

echo "The portal did not become healthy within 150 seconds." >&2
"${script_dir}/compose.sh" ps
exit 1