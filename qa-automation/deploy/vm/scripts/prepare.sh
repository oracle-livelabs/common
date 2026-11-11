#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"
secrets_dir="${deploy_dir}/secrets"
env_file="${deploy_dir}/.env"
example_env="${deploy_dir}/.env.example"

for command_name in openssl htpasswd grep tail; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Required command is missing: ${command_name}" >&2
    exit 1
  }
done

umask 077
mkdir -p "$secrets_dir"
if [[ ! -f "$env_file" ]]; then
  cp "$example_env" "$env_file"
fi

env_value() {
  local key="$1"
  local fallback="${2:-}"
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

public_host="${1:-$(env_value QA_PUBLIC_HOST)}"
admin_user="$(env_value JENKINS_ADMIN_USER qa-admin)"
report_user="$(env_value QA_REPORT_USER qa-reviewer)"

[[ -n "$public_host" ]] || {
  echo "QA_PUBLIC_HOST is required before credentials and TLS can be prepared." >&2
  exit 1
}

if [[ ! -s "${secrets_dir}/jenkins-admin-secret" ]]; then
  openssl rand -hex 24 > "${secrets_dir}/jenkins-admin-secret"
fi

if [[ ! -s "${secrets_dir}/report-secret" ]]; then
  openssl rand -hex 18 > "${secrets_dir}/report-secret"
fi

htpasswd -Bbn "$report_user" "$(tr -d '\r\n' < "${secrets_dir}/report-secret")" \
  > "${secrets_dir}/reports.htpasswd"

if [[ ! -f "${secrets_dir}/livelabs-username" ]]; then
  : > "${secrets_dir}/livelabs-username"
fi
if [[ ! -f "${secrets_dir}/livelabs-secret" ]]; then
  : > "${secrets_dir}/livelabs-secret"
fi

if [[ ! -s "${secrets_dir}/tls.key" || ! -s "${secrets_dir}/tls.crt" ]]; then
  if [[ "$public_host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    subject_alt_name="IP:${public_host}"
  else
    subject_alt_name="DNS:${public_host}"
  fi
  openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 \
    -keyout "${secrets_dir}/tls.key" \
    -out "${secrets_dir}/tls.crt" \
    -subj "/CN=${public_host}" \
    -addext "subjectAltName=${subject_alt_name}"
fi

cat > "${secrets_dir}/bootstrap-credentials" <<EOF
Jenkins user: ${admin_user}
Jenkins password: $(tr -d '\r\n' < "${secrets_dir}/jenkins-admin-secret")
Report user: ${report_user}
Report password: $(tr -d '\r\n' < "${secrets_dir}/report-secret")
EOF

chmod 600 "${secrets_dir}"/*
echo "VM credentials and TLS files are prepared. No secret values were printed."
