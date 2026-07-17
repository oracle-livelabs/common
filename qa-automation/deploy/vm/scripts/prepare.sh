#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"
secrets_dir="${deploy_dir}/secrets"
env_file="${deploy_dir}/.env"
example_env="${deploy_dir}/.env.example"

for command_name in openssl htpasswd grep cut tr; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is missing: ${command_name}" >&2
    exit 1
  fi
done

umask 077
mkdir -p "$secrets_dir"
if [[ ! -f "$env_file" ]]; then
  cp "$example_env" "$env_file"
fi

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

public_host="${1:-$(env_value QA_PUBLIC_HOST qa-vm.internal.example)}"
admin_user="$(env_value JENKINS_ADMIN_USER qa-admin)"
report_user="$(env_value QA_REPORT_USER qa-reviewer)"
new_admin=false
new_report=false

if [[ ! -s "${secrets_dir}/jenkins-admin-secret" ]]; then
  openssl rand -hex 24 > "${secrets_dir}/jenkins-admin-secret"
  new_admin=true
fi

if [[ ! -s "${secrets_dir}/reports.htpasswd" ]]; then
  report_secret="$(openssl rand -hex 18)"
  htpasswd -Bbn "$report_user" "$report_secret" > "${secrets_dir}/reports.htpasswd"
  new_report=true
fi

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
  openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 30 \
    -keyout "${secrets_dir}/tls.key" \
    -out "${secrets_dir}/tls.crt" \
    -subj "/CN=${public_host}" \
    -addext "subjectAltName=${subject_alt_name}"
fi

chmod 600 "${secrets_dir}"/*

cat <<EOF
VM files are prepared in ${deploy_dir}.

Security follow-up:
  1. Keep QA_BIND_ADDRESS limited to the VM private VPN address.
  2. Replace the temporary TLS certificate with an internal CA certificate for team use.
  3. Put optional LiveLabs sign-in values in livelabs-username and livelabs-secret.
EOF

if [[ "$new_admin" == true ]]; then
  printf '\nJenkins user: %s\nJenkins initial secret: %s\n' "$admin_user" "$(cat "${secrets_dir}/jenkins-admin-secret")"
fi
if [[ "$new_report" == true ]]; then
  printf '\nReport user: %s\nReport initial secret: %s\n' "$report_user" "$report_secret"
fi
if [[ "$new_admin" == true || "$new_report" == true ]]; then
  echo "Store these generated values in the approved secret manager; they are shown only on this first preparation run."
fi