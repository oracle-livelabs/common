#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"
compose_file="${deploy_dir}/compose.yaml"
env_file="${deploy_dir}/.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing ${env_file}. Run ./scripts/prepare.sh first." >&2
  exit 1
fi

if command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  exec podman compose --env-file "$env_file" -f "$compose_file" "$@"
fi
if command -v podman-compose >/dev/null 2>&1; then
  exec podman-compose --env-file "$env_file" -f "$compose_file" "$@"
fi
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  exec docker compose --env-file "$env_file" -f "$compose_file" "$@"
fi

echo "Podman Compose or Docker Compose is required." >&2
exit 1