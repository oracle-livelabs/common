#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo after the stack has passed its first start." >&2
  exit 1
fi

qa_user="${SUDO_USER:-${1:-}}"
if [[ -z "$qa_user" || "$qa_user" == "root" ]]; then
  echo "Provide the non-root VM account that owns the checkout." >&2
  exit 1
fi

qa_uid="$(id -u "$qa_user")"
qa_home="$(getent passwd "$qa_user" | cut -d: -f6)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="$(cd "${script_dir}/.." && pwd)"
template="${deploy_dir}/systemd/livelabs-qa.service.template"
target="/etc/systemd/system/livelabs-qa.service"

escape_sed() {
  printf '%s' "$1" | sed 's/[&|]/\\&/g'
}

sed \
  -e "s|@QA_USER@|$(escape_sed "$qa_user")|g" \
  -e "s|@QA_UID@|$(escape_sed "$qa_uid")|g" \
  -e "s|@QA_HOME@|$(escape_sed "$qa_home")|g" \
  -e "s|@QA_DEPLOY_DIR@|$(escape_sed "$deploy_dir")|g" \
  "$template" > "$target"

loginctl enable-linger "$qa_user"
systemctl daemon-reload
systemctl enable --now livelabs-qa.service
systemctl --no-pager status livelabs-qa.service