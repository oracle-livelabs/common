#!/bin/sh
set -eu

source_file=/run/secrets/reports_htpasswd
target_file=/var/run/reports.htpasswd

if [ ! -s "$source_file" ]; then
  echo "The report authentication secret is missing or empty." >&2
  exit 1
fi

cp "$source_file" "$target_file"
chown root:nginx "$target_file"
chmod 0640 "$target_file"
