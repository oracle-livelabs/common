#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file="${script_dir}/.env"
example_env="${script_dir}/.env.example"

private_address=""
public_host=""
https_port=""
jenkins_internal_port=""
par_resolver_internal_port=""
portal_internal_port=""
vpn_cidr=""
skip_packages=false
skip_systemd=false
crowdstrike_rpm=""
crowdstrike_cid_file=""
qid_installer=""
falcon_installer=""

usage() {
  cat <<'EOF'
Install and start the LiveLabs QA service on an approved private Oracle Linux VM.

The public repository intentionally contains no environment-specific addresses,
ports, identity-provider values, group names, secret values, or secret OCIDs.
Supply those values from the approved internal provisioning record.

Usage:
  bash install.sh [options]

Required options:
  --https-port <port>          Approved private portal port.
  --jenkins-port <port>        Approved container-only Jenkins port.
  --par-resolver-port <port>   Approved container-only PAR resolver port.
  --portal-port <port>         Approved container-only portal port.

Optional options:
  --private-address <IPv4>     VM private IPv4 address. Auto-detected when safe.
  --host <name-or-IPv4>        Approved internal DNS name. Defaults to private IP.
  --vpn-cidr <CIDR>            Approved VPN CIDR for the host firewall.
  --crowdstrike-rpm <path>     Approved pre-staged Falcon sensor RPM.
  --crowdstrike-cid-file <path>
                               Secure Falcon CID file; never a CLI value.
  --qid-installer <path>       Approved Oracle QID mitigator script.
  --falcon-installer <path>    Approved Oracle Falcon sensor script.
  --skip-packages              Do not install Oracle Linux packages.
  --skip-systemd               Do not register automatic startup after reboot.
  -h, --help                   Show this help.

The ignored deploy/vm/.env contains environment-specific addresses, schedules,
and optional publishing settings. Generated credentials stay under secrets/.
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --private-address)
      [[ $# -ge 2 ]] || fail "--private-address needs a value."
      private_address="$2"
      shift 2
      ;;
    --host)
      [[ $# -ge 2 ]] || fail "--host needs a value."
      public_host="$2"
      shift 2
      ;;
    --https-port)
      [[ $# -ge 2 ]] || fail "--https-port needs a value."
      https_port="$2"
      shift 2
      ;;
    --jenkins-port)
      [[ $# -ge 2 ]] || fail "--jenkins-port needs a value."
      jenkins_internal_port="$2"
      shift 2
      ;;
    --par-resolver-port)
      [[ $# -ge 2 ]] || fail "--par-resolver-port needs a value."
      par_resolver_internal_port="$2"
      shift 2
      ;;
    --portal-port)
      [[ $# -ge 2 ]] || fail "--portal-port needs a value."
      portal_internal_port="$2"
      shift 2
      ;;
    --vpn-cidr)
      [[ $# -ge 2 ]] || fail "--vpn-cidr needs a value."
      vpn_cidr="$2"
      shift 2
      ;;
    --crowdstrike-rpm)
      [[ $# -ge 2 ]] || fail "--crowdstrike-rpm needs a path."
      crowdstrike_rpm="$2"
      shift 2
      ;;
    --crowdstrike-cid-file)
      [[ $# -ge 2 ]] || fail "--crowdstrike-cid-file needs a path."
      crowdstrike_cid_file="$2"
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
    --skip-packages)
      skip_packages=true
      shift
      ;;
    --skip-systemd)
      skip_systemd=true
      shift
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

if [[ "$EUID" -eq 0 ]]; then
  fail "Run this installer without sudo as the non-root account that owns the checkout."
fi

command -v sudo >/dev/null 2>&1 || fail "sudo is required."
[[ -f "$example_env" ]] || fail "Missing ${example_env}. Run this script from a complete repository checkout."

is_private_ipv4() {
  local address="$1"
  local first second third fourth
  IFS=. read -r first second third fourth <<< "$address"
  for octet in "$first" "$second" "$third" "$fourth"; do
    [[ "$octet" =~ ^[0-9]+$ ]] || return 1
    (( octet >= 0 && octet <= 255 )) || return 1
  done

  (( first == 10 )) && return 0
  (( first == 172 && second >= 16 && second <= 31 )) && return 0
  (( first == 192 && second == 168 )) && return 0
  (( first == 127 )) && return 0
  return 1
}

detect_private_address() {
  local address
  local -a candidates=()
  while read -r address; do
    [[ -n "$address" ]] || continue
    if is_private_ipv4 "$address" && [[ "$address" != 127.* ]]; then
      candidates+=("$address")
    fi
  done < <(hostname -I 2>/dev/null | tr ' ' '\n' | sort -u)

  if [[ ${#candidates[@]} -eq 1 ]]; then
    printf '%s' "${candidates[0]}"
    return
  fi
  if [[ ${#candidates[@]} -eq 0 ]]; then
    fail "No RFC1918 VM address was detected. Pass --private-address explicitly."
  fi
  fail "More than one private address was detected (${candidates[*]}). Pass --private-address explicitly."
}

if [[ -z "$private_address" ]]; then
  private_address="$(detect_private_address)"
fi
is_private_ipv4 "$private_address" || fail "--private-address must be a private or loopback IPv4 address."
[[ "$private_address" != "0.0.0.0" ]] || fail "The portal cannot bind to 0.0.0.0."

if [[ -z "$public_host" ]]; then
  public_host="$private_address"
fi
[[ "$public_host" =~ ^[A-Za-z0-9.-]+$ ]] || fail "--host must be an internal DNS name or IPv4 address, not a URL."
validate_private_port() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || fail "${label} must be numeric."
  (( value >= 1024 && value <= 65535 )) || fail "${label} must be between 1024 and 65535."
  for forbidden_port in 22 80 443 3000 5000 8000 8080 8443; do
    [[ "$value" != "$forbidden_port" ]] || fail "${label} must use an approved non-standard value."
  done
}

validate_private_port --https-port "$https_port"
validate_private_port --jenkins-port "$jenkins_internal_port"
validate_private_port --par-resolver-port "$par_resolver_internal_port"
validate_private_port --portal-port "$portal_internal_port"
[[ "$(printf '%s\n' "$https_port" "$jenkins_internal_port" "$par_resolver_internal_port" "$portal_internal_port" | sort -u | wc -l)" == "4" ]] || fail "All QA service ports must be distinct."

crowdstrike_args=()
if [[ -n "$crowdstrike_rpm" ]]; then
  crowdstrike_args+=(--rpm "$crowdstrike_rpm")
fi
if [[ -n "$crowdstrike_cid_file" ]]; then
  crowdstrike_args+=(--cid-file "$crowdstrike_cid_file")
fi
if [[ -n "$qid_installer" ]]; then
  crowdstrike_args+=(--qid-installer "$qid_installer")
fi
if [[ -n "$falcon_installer" ]]; then
  crowdstrike_args+=(--falcon-installer "$falcon_installer")
fi
bash "${script_dir}/scripts/ensure-crowdstrike.sh" "${crowdstrike_args[@]}"

if [[ "$skip_packages" == false ]]; then
  [[ -r /etc/os-release ]] || fail "Cannot identify this operating system. Use Oracle Linux 9 or install the prerequisites manually with --skip-packages."
  # shellcheck disable=SC1091
  source /etc/os-release
  version_id="${VERSION_ID:-}"
  [[ "${ID:-}" == "ol" && "${version_id%%.*}" == "9" ]] || fail "Automatic package setup supports Oracle Linux 9. Install the prerequisites manually and use --skip-packages on another distribution."
  command -v dnf >/dev/null 2>&1 || fail "dnf is required for automatic package setup."
  sudo dnf install -y git openssl curl podman firewalld httpd-tools
  if ! podman compose version >/dev/null 2>&1 && ! command -v podman-compose >/dev/null 2>&1; then
    sudo dnf install -y oracle-epel-release-el9
    if ! sudo dnf install -y podman-compose; then
      sudo dnf install -y python3-pip
      sudo python3 -m pip install --no-cache-dir podman-compose==1.6.0
    fi
  fi
fi

for command_name in git openssl curl podman awk grep tr sort wc base64 oci; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Required command is missing: ${command_name}"
done
if ! podman compose version >/dev/null 2>&1 && ! command -v podman-compose >/dev/null 2>&1; then
  fail "Podman Compose is required. Install podman-compose, then rerun this installer."
fi


if [[ ! -f "$env_file" ]]; then
  cp "$example_env" "$env_file"
fi

set_env_value() {
  local key="$1"
  local value="$2"
  local temporary
  temporary="$(mktemp "${env_file}.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 {
      if (!updated) {
        print key "=" value
        updated = 1
      }
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$env_file" > "$temporary"
  mv "$temporary" "$env_file"
}

set_env_value QA_BIND_ADDRESS "$private_address"
set_env_value QA_HTTPS_PORT "$https_port"
set_env_value QA_JENKINS_INTERNAL_PORT "$jenkins_internal_port"
set_env_value QA_PAR_RESOLVER_INTERNAL_PORT "$par_resolver_internal_port"
set_env_value QA_PORTAL_INTERNAL_PORT "$portal_internal_port"
set_env_value QA_PUBLIC_HOST "$public_host"
set_env_value QA_PUBLIC_URL "https://${public_host}:${https_port}"

"${script_dir}/scripts/prepare.sh" "$public_host"

if [[ -n "$vpn_cidr" ]]; then
  command -v firewall-cmd >/dev/null 2>&1 || fail "--vpn-cidr was provided, but firewalld is not installed. Configure the host firewall centrally or rerun without --vpn-cidr."
  sudo systemctl enable --now firewalld
  firewall_rule="rule family=ipv4 source address=${vpn_cidr} port port=${https_port} protocol=tcp accept"
  sudo firewall-cmd --permanent --add-rich-rule="$firewall_rule"
  sudo firewall-cmd --reload
fi

"${script_dir}/scripts/start.sh"

if [[ "$skip_systemd" == false ]]; then
  sudo bash "${script_dir}/scripts/install-systemd.sh"
fi

echo
bash "${script_dir}/scripts/access-info.sh"

if [[ -z "$vpn_cidr" ]]; then
  cat <<EOF

Host firewall note:
  This installer did not open port ${https_port}. If firewalld blocks it, rerun
  with --vpn-cidr <approved-Oracle-VPN-CIDR>. OCI routing and NSG rules must also
  allow that VPN CIDR to this VM private address only.
EOF
fi
