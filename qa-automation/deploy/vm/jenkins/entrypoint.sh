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
for channel in par regression; do
  if [[ ! -f "/var/qa-reports/${channel}/index.html" ]]; then
    cat > "/var/qa-reports/${channel}/index.html" <<EOF
<!doctype html><meta charset="utf-8"><title>LiveLabs QA</title><h1>No ${channel} report yet</h1><p>Run the matching Jenkins job to create the first report.</p>
EOF
  fi
done

chown -R jenkins:jenkins "${NPM_CONFIG_CACHE}" /var/jenkins_home/.cache
chown jenkins:jenkins /var/jenkins_home /var/qa-reports /var/qa-reports/par /var/qa-reports/regression
chown jenkins:jenkins /var/qa-reports/par/index.html /var/qa-reports/regression/index.html

exec /usr/bin/tini -- runuser --user jenkins --preserve-environment -- /usr/local/bin/jenkins.sh "$@"
