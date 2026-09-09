#!/usr/bin/env bash
set -euo pipefail

read_required_secret() {
  local file="$1"
  if [[ ! -s "$file" ]]; then
    echo "Required secret file is missing or empty: $file" >&2
    exit 1
  fi
  tr -d '\r\n' < "$file"
}

read_optional_secret() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  tr -d '\r\n' < "$file"
}

export JENKINS_BOOTSTRAP_SECRET="$(read_required_secret /run/secrets/jenkins_admin_secret)"
export LIVELABS_USERNAME="$(read_optional_secret /run/secrets/livelabs_username)"
export LIVELABS_SECRET="$(read_optional_secret /run/secrets/livelabs_secret)"
export HOME=/var/jenkins_home
export NPM_CONFIG_CACHE="${HOME}/.npm"

mkdir -p /var/qa-reports/par /var/qa-reports/regression "${NPM_CONFIG_CACHE}" /var/jenkins_home/.cache/fontconfig

if ! /usr/local/bin/livelabs-qa-restore-reports; then
  echo "Saved report restore failed; continuing with reports already present on the VM." >&2
fi
node /opt/qa-report-tools/scripts/reporters/rebuild-saved-reports.mjs \
  --reports-base "${QA_ROOT_REPORTS_BASE:-/var/qa-reports}"

chown -R jenkins:jenkins "${NPM_CONFIG_CACHE}" /var/jenkins_home/.cache
chown -R jenkins:jenkins /var/qa-reports
chown jenkins:jenkins /var/jenkins_home

exec /usr/bin/tini -- runuser --user jenkins --preserve-environment -- /usr/local/bin/jenkins.sh "$@"
