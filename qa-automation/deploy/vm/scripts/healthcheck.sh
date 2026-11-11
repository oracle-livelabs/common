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

bind_address="$(value_from_env QA_BIND_ADDRESS "")"
https_port="$(value_from_env QA_HTTPS_PORT "")"
project_name="$(value_from_env COMPOSE_PROJECT_NAME livelabs-qa)"
[[ -n "$bind_address" && -n "$https_port" ]] || { echo "QA_BIND_ADDRESS and QA_HTTPS_PORT are required." >&2; exit 1; }
base_url="https://${bind_address}:${https_port}"

portal_container_is_healthy() {
  local runtime name status
  for runtime in podman docker; do
    command -v "$runtime" >/dev/null 2>&1 || continue
    for name in "${project_name}_portal_1" "${project_name}-portal-1"; do
      status="$($runtime inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$name" 2>/dev/null || true)"
      [[ "$status" == "healthy" ]] && return 0
    done
  done
  return 1
}

for attempt in $(seq 1 30); do
  if portal_container_is_healthy || curl --noproxy "*" --insecure --fail --silent "${base_url}/healthz" >/dev/null; then
    echo "LiveLabs QA portal is ready at ${base_url}/"
    exit 0
  fi
  sleep 5
done

echo "The portal did not become healthy within 150 seconds." >&2
"${script_dir}/compose.sh" ps
exit 1