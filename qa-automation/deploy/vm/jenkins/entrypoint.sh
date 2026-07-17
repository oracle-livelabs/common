#!/usr/bin/env bash
set -euo pipefail

read_secret() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "Required secret file is missing: $file" >&2
    exit 1
  fi
  tr -d '\r\n' < "$file"
}

export JENKINS_BOOTSTRAP_SECRET="$(read_secret /run/secrets/jenkins_admin_secret)"
export LIVELABS_USERNAME="$(read_secret /run/secrets/livelabs_username)"
export LIVELABS_SECRET="$(read_secret /run/secrets/livelabs_secret)"

if [[ -z "$JENKINS_BOOTSTRAP_SECRET" ]]; then
  echo "The Jenkins bootstrap secret cannot be empty." >&2
  exit 1
fi

mkdir -p /var/qa-reports/par /var/qa-reports/regression /var/jenkins_home/.cache/fontconfig
for channel in par regression; do
  if [[ ! -f "/var/qa-reports/${channel}/index.html" ]]; then
    cat > "/var/qa-reports/${channel}/index.html" <<EOF
<!doctype html><meta charset="utf-8"><title>LiveLabs QA</title><h1>No ${channel} report yet</h1><p>Run the matching Jenkins job to create the first report.</p>
EOF
  fi
done

chown jenkins:jenkins /var/jenkins_home /var/jenkins_home/.cache /var/jenkins_home/.cache/fontconfig /var/qa-reports /var/qa-reports/par /var/qa-reports/regression
chown jenkins:jenkins /var/qa-reports/par/index.html /var/qa-reports/regression/index.html

exec /usr/bin/tini -- runuser --user jenkins --preserve-environment -- /usr/local/bin/jenkins.sh "$@"