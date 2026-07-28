#!/usr/bin/env bash
set -euo pipefail

sensor_rpm=""
cid_file=""
qid_installer=""
falcon_installer=""
falconctl="/opt/CrowdStrike/falconctl"
service_name="falcon-sensor"

usage() {
  cat <<'EOF'
Require a configured and running CrowdStrike Falcon sensor before QA services start.

Usage:
  bash ensure-crowdstrike.sh [options]

Options:
  --rpm <path>       Pre-staged corporate Falcon sensor RPM.
  --cid-file <path>  Root-readable or user-readable file containing only the CID.
  --qid-installer <path>
                     Approved Oracle QID mitigator script.
  --falcon-installer <path>
                     Approved Oracle Falcon sensor script.
  -h, --help         Show this help.

When the sensor is already configured and active, no options are required.
The two Oracle installer scripts must be supplied together. Their download
locations belong in the internal provisioning process, not this repository.
Never pass the CID directly on the command line or store it in this repository.
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rpm)
      [[ $# -ge 2 ]] || fail "--rpm needs a path."
      sensor_rpm="$2"
      shift 2
      ;;
    --cid-file)
      [[ $# -ge 2 ]] || fail "--cid-file needs a path."
      cid_file="$2"
      shift 2
      ;;
    --qid-installer)
      [[ $# -ge 2 ]] || fail "--qid-installer needs a path."
      qid_installer="$2"
      shift 2
      ;;
    --falcon-installer)
      [[ $# -ge 2 ]] || fail "--falcon-installer needs a path."
      falcon_installer="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

command -v sudo >/dev/null 2>&1 || fail "sudo is required."
command -v systemctl >/dev/null 2>&1 || fail "systemd is required."

sensor_configured() {
  local output
  sudo test -x "$falconctl" || return 1
  output="$(sudo "$falconctl" -g --cid 2>/dev/null || true)"
  [[ "$output" =~ [0-9A-Fa-f]{32}(-[0-9A-Fa-f]{2})? ]]
}

sensor_active() {
  sudo systemctl is-active --quiet "$service_name"
}

if sensor_configured && sensor_active; then
  echo "CrowdStrike Falcon sensor is configured and running."
  exit 0
fi

if [[ -n "$qid_installer" || -n "$falcon_installer" ]]; then
  [[ -n "$qid_installer" && -n "$falcon_installer" ]] || {
    fail "Supply both --qid-installer and --falcon-installer."
  }
  [[ -f "$qid_installer" ]] || fail "QID mitigator script not found: ${qid_installer}"
  [[ -f "$falcon_installer" ]] || fail "Falcon sensor script not found: ${falcon_installer}"

  sudo bash "$falcon_installer" --apply
  sudo bash "$qid_installer" --apply
fi

if [[ -n "$sensor_rpm" ]]; then
  [[ -f "$sensor_rpm" ]] || fail "CrowdStrike RPM not found: ${sensor_rpm}"
  sudo dnf install -y "$sensor_rpm"
elif ! sudo rpm -q "$service_name" >/dev/null 2>&1; then
  fail "CrowdStrike is not installed. Provide the approved Oracle installers or the approved sensor RPM and CID file."
fi

sudo test -x "$falconctl" || fail "CrowdStrike falconctl was not installed at ${falconctl}."

if [[ -n "$cid_file" ]]; then
  [[ -f "$cid_file" ]] || fail "CrowdStrike CID file not found: ${cid_file}"
  cid="$(tr -d '\r\n' < "$cid_file")"
  [[ "$cid" =~ ^[0-9A-Fa-f]{32}(-[0-9A-Fa-f]{2})?$ ]] || fail "The CrowdStrike CID file does not contain a valid CID."
  sudo "$falconctl" -s --cid="$cid" >/dev/null
  unset cid
elif ! sensor_configured; then
  fail "CrowdStrike is installed but not configured. Provide the CID through --cid-file."
fi

sudo systemctl enable --now "$service_name"
sleep 3

sensor_configured || fail "CrowdStrike is running without a valid configured CID."
sensor_active || fail "CrowdStrike service did not become active."

echo "CrowdStrike Falcon sensor is configured and running."
