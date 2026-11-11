#!/usr/bin/env bash
set -euo pipefail

channel="${1:-}"
case "$channel" in
  par|regression) ;;
  *) echo "Usage: publish-reports.sh <par|regression>" >&2; exit 2 ;;
esac

reports_base="${QA_ROOT_REPORTS_BASE:-/var/qa-reports}"
channel_root="${reports_base%/}/${channel}"
latest_dir="${channel_root}/latest"
summary_file="${latest_dir}/summary.json"

if [[ ! -f "$summary_file" ]]; then
  echo "No ${channel} summary exists at ${summary_file}; nothing was published."
  exit 0
fi

namespace="${QA_OBJECT_STORAGE_NAMESPACE:-}"
bucket="${QA_OBJECT_STORAGE_BUCKET:-}"
if [[ -z "$namespace" || -z "$bucket" ]]; then
  echo "Object Storage publishing is disabled; local ${channel} reports remain available."
  exit 0
fi

if ! command -v oci >/dev/null 2>&1; then
  echo "Object Storage is configured, but the OCI CLI is not installed." >&2
  exit 1
fi

run_id="$(node -e 'const fs=require("fs"); const value=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(String(value.runId || ""));' "$summary_file")"
if [[ ! "$run_id" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "The report contains an invalid run identifier." >&2
  exit 1
fi

run_dir="${channel_root}/runs/${run_id}"
if [[ ! -d "$run_dir" ]]; then
  echo "The report run directory is missing: ${run_dir}" >&2
  exit 1
fi

prefix="${QA_OBJECT_STORAGE_PREFIX:-livelabs-qa}"
prefix="${prefix#/}"
prefix="${prefix%/}"
auth_mode="${QA_OCI_AUTH_MODE:-instance_principal}"
auth_args=()
case "$auth_mode" in
  instance_principal|resource_principal|security_token)
    auth_args=(--auth "$auth_mode")
    ;;
  config_file|"")
    ;;
  *)
    echo "Unsupported QA_OCI_AUTH_MODE: ${auth_mode}" >&2
    exit 1
    ;;
esac

upload_dir() {
  local source_dir="$1"
  local object_prefix="$2"
  oci os object bulk-upload \
    --namespace-name "$namespace" \
    --bucket-name "$bucket" \
    --src-dir "$source_dir" \
    --object-prefix "$object_prefix" \
    --overwrite \
    "${auth_args[@]}"
}

upload_file() {
  local source_file="$1"
  local object_name="$2"
  [[ -f "$source_file" ]] || return 0
  oci os object put \
    --namespace-name "$namespace" \
    --bucket-name "$bucket" \
    --file "$source_file" \
    --name "$object_name" \
    --force \
    "${auth_args[@]}"
}

# Publish the immutable run first. The latest pointer is replaced only after the
# complete run is available, so report readers never see a half-uploaded run.
upload_dir "$run_dir" "${prefix}/${channel}/runs/${run_id}/"
upload_dir "$latest_dir" "${prefix}/${channel}/latest/"
upload_file "${channel_root}/history.json" "${prefix}/${channel}/history.json"
upload_file "${channel_root}/index.html" "${prefix}/${channel}/index.html"
echo "Published sanitized ${channel} report ${run_id} to ${bucket}/${prefix}/${channel}."
