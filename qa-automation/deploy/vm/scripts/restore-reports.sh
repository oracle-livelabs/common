#!/usr/bin/env bash
set -euo pipefail

reports_base="${QA_ROOT_REPORTS_BASE:-/var/qa-reports}"
namespace="${QA_OBJECT_STORAGE_NAMESPACE:-}"
bucket="${QA_OBJECT_STORAGE_BUCKET:-}"

if [[ -z "$namespace" || -z "$bucket" ]]; then
  echo "Object Storage report restore is not configured; using the persistent VM report volume."
  exit 0
fi

if ! command -v oci >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  echo "Object Storage report restore requires the OCI CLI and jq." >&2
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

restore_channel() {
  local channel="$1"
  local channel_root="${reports_base%/}/${channel}"
  local channel_prefix="${prefix}/${channel}/"
  local existing_summary
  local object_json
  local object_name
  local relative_name
  local target_file
  local downloaded=0
  local temporary_dir

  mkdir -p "$channel_root"
  existing_summary="$(find "$channel_root" -mindepth 2 -maxdepth 3 -type f -name summary.json -print -quit)"
  if [[ -n "$existing_summary" ]]; then
    echo "Saved ${channel} reports already exist on the VM; no restore is needed."
    return 0
  fi

  object_json="$(
    oci os object list \
      --namespace-name "$namespace" \
      --bucket-name "$bucket" \
      --prefix "$channel_prefix" \
      --all \
      --query 'data[].name' \
      --output json \
      "${auth_args[@]}"
  )"
  if [[ "$(jq 'length' <<<"$object_json")" -eq 0 ]]; then
    echo "No saved ${channel} reports were found in Object Storage."
    return 0
  fi

  temporary_dir="$(mktemp -d)"
  while IFS= read -r object_name; do
    [[ -n "$object_name" ]] || continue
    relative_name="${object_name#"$channel_prefix"}"
    if [[ -z "$relative_name" || "$relative_name" == /* || "$relative_name" == ".." || "$relative_name" == ../* || "$relative_name" == */../* || "$relative_name" == */.. ]]; then
      echo "Ignoring unsafe report object name: ${object_name}" >&2
      continue
    fi

    target_file="${temporary_dir}/${relative_name}"
    mkdir -p "$(dirname "$target_file")"
    oci os object get \
      --namespace-name "$namespace" \
      --bucket-name "$bucket" \
      --name "$object_name" \
      --file "$target_file" \
      --force \
      "${auth_args[@]}" >/dev/null
    downloaded=$((downloaded + 1))
  done < <(jq -r '.[]?' <<<"$object_json")

  if [[ "$downloaded" -gt 0 ]]; then
    cp -a "${temporary_dir}/." "${channel_root}/"
    echo "Restored ${downloaded} saved ${channel} report file(s) from Object Storage."
  fi
  rm -rf "$temporary_dir"
}

restore_channel par
restore_channel regression
