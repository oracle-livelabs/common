# LiveLabs QA Hub VM

## Purpose

This runbook covers the private VM that hosts the LiveLabs QA Hub. The VM runs two operator-facing Jenkins jobs:

* **LiveLabs PAR audit**: weekly, catalog-wide PAR link discovery and validation.
* **LiveLabs overall regression**: nightly catalog regression, with optional targeted item IDs.

The VM uses custom Jenkins and report-portal **container images** built from `common/qa-automation`. It does not require a custom OCI VM image.

## How the access model works

1. OCI provides a VM with no public IP in a private subnet.
2. Oracle VPN routing and an OCI NSG allow approved users to reach the VM private address.
3. The QA Hub publishes only private HTTPS port `32443`. Jenkins uses internal port `32080`, the portal uses internal port `32444`, and administrative SSH uses private port `32222`.
4. Users connect to Oracle VPN, open the internal QA Hub URL, sign in, and select **Build with Parameters**.
5. Jenkins runs the selected test profile and publishes the latest and historical reports in the same private portal.

The installer configures the VM software. It deliberately does not create the OCI subnet, VPN route, NSG, DNS record, or production TLS certificate.

## Before running the installer

Ask the OCI/network administrator to provide:

| Requirement | Expected setting |
| --- | --- |
| VM | Oracle Linux 9, recommended 4 OCPUs, 16 GB memory, and 80 GB boot volume |
| Network | Private subnet with no public IPv4 address |
| User access | Oracle VPN route to the VM private subnet |
| Outbound access | Approved HTTPS egress through an OCI NAT gateway or managed proxy for GitHub, container registries, package repositories, LiveLabs, and optional OCI services |
| OCI ingress | Approved Oracle VPN CIDR to TCP `32222` for SSH and `32443` for the QA portal; no standard service ports |
| Endpoint protection | Approved CrowdStrike Falcon sensor RPM and CID, or a base VM where the sensor is already configured and active |
| DNS | Optional internal name such as `qa-hub.internal.example` mapped to the VM private IP |
| TLS | Internal CA certificate for the chosen internal name |

Do not point a public DNS record at the VM and do not allow `0.0.0.0/0` ingress.

### OCI CLI authentication

The VM can be created through OCI CLI with a separate local profile named `VM-QA-hub`. Do not send API keys, security tokens, private keys, or passwords through chat and do not store them in the repository. Use an OCI CLI browser session on this computer:

```powershell
oci session authenticate --profile-name VM-QA-hub --region <OCI_REGION>
```

After authentication, OCI CLI can discover or create the compute instance and return its private IP. The provisioning command still needs these approved inputs:

| Value | Source |
| --- | --- |
| OCI region and compartment OCID | `oradbclouducm` tenancy and the `Luchian-marco` compartment |
| Subnet and NSG OCIDs | Existing private network connected to Oracle VPN |
| VM private IP | Assigned by OCI when the instance is created |
| Internal DNS name | Chosen internal record; optional for initial inspection |
| Oracle VPN CIDR | Corporate network or OCI network administrator |
| SSH public key | The operator's approved public key; never the private key |
| CrowdStrike RPM and CID | Approved corporate CrowdStrike source or secret manager |

The internal DNS name and VPN CIDR cannot be safely guessed from the VM. The VM private IP is returned by OCI CLI after launch.

## First-time installation

SSH to the VM using the non-root account that will own the checkout, then run:

```bash
git clone https://github.com/oracle-livelabs/common.git
cd common/qa-automation/deploy/vm
bash install.sh \
  --private-address <VM_PRIVATE_IP> \
  --host <INTERNAL_DNS_NAME> \
  --vpn-cidr <APPROVED_ORACLE_VPN_CIDR> \
  --crowdstrike-rpm /secure/falcon-sensor.rpm \
  --crowdstrike-cid-file /secure/falcon-cid
```

If CrowdStrike is already installed, configured, and active in the approved base VM, omit both CrowdStrike options; the installer verifies the existing sensor. If internal DNS is not ready, omit `--host`; the private IP becomes the temporary access host. If the host firewall is managed centrally, omit `--vpn-cidr` and let the administrator add the restricted rule.

The installer:

1. Installs or verifies CrowdStrike Falcon and refuses to start Jenkins unless the sensor has a valid CID and is active.
2. Installs Git, OpenSSL, curl, Podman, and supporting tools with `dnf`; when needed, it adds Oracle's `oracle-epel-release-el9` package to install Podman Compose.
3. Creates ignored local configuration and one-time Jenkins/report credentials.
4. Binds the portal to the supplied private IP and non-standard HTTPS port `32443`.
5. Builds and starts the Jenkins and report-portal container images on non-standard internal ports.
6. Verifies the private health endpoint.
7. Registers `livelabs-qa.service` so the stack starts after a VM reboot.
8. Prints the portal, Jenkins, PAR report, and regression report URLs.

Run the installer without `sudo`; it requests `sudo` only for host package, firewall, and systemd changes. It is safe to rerun and preserves existing secrets.

The permanent setup assumes this deployment package has reached `oracle-livelabs/common:main`. Jenkins defaults to `QA_GIT_URL=https://github.com/oracle-livelabs/common.git` and `QA_GIT_BRANCH=*/main`; do not leave a personal fork configured on the shared VM.

### Inspect before opening a PR

You can create the private VM and inspect the portal before opening or merging a PR. A ZIP of the local `qa-automation` folder is enough to build the Jenkins and portal interface, but Jenkins test jobs always clone their test code from Git. To run the current unmerged tests, push the topic branch to your fork, then set these ignored `.env` values on the VM:

```text
QA_GIT_URL=https://github.com/<YOUR_GITHUB_USER>/common.git
QA_GIT_BRANCH=*/<TOPIC_BRANCH>
```

No PR or merge is required for that inspection run. Before the VM becomes shared or permanent, point both values back to `oracle-livelabs/common` and `*/main`.

Store the credentials printed on the first run in the approved secret manager. They are ignored by Git and are not included in reports.

### Replace the inspection certificate

The first run creates a 30-day self-signed certificate only for inspection. Before team use, replace these ignored files with the internal CA certificate and private key:

```text
qa-automation/deploy/vm/secrets/tls.crt
qa-automation/deploy/vm/secrets/tls.key
```

Then restart the portal:

```bash
cd common/qa-automation/deploy/vm
bash scripts/compose.sh restart portal
bash scripts/healthcheck.sh
```

### Optional private LiveLabs content

Public catalog checks do not need a LiveLabs account. For approved private content, retrieve the QA account from the secret manager and enter it without placing values in shell history:

```bash
cd common/qa-automation/deploy/vm
umask 077
read -r -p "LiveLabs QA username: " livelabs_user
read -r -s -p "LiveLabs QA sign-in secret: " livelabs_secret
printf '\n'
printf '%s' "$livelabs_user" > secrets/livelabs-username
printf '%s' "$livelabs_secret" > secrets/livelabs-secret
unset livelabs_user livelabs_secret
bash scripts/compose.sh up -d --force-recreate jenkins portal
```

Set `QA_AUTH_TARGET_URL` in the ignored `.env` file when the scheduled jobs must establish a private LiveLabs session. Never place either sign-in value in `.env`, Git, a Jenkins parameter, or a command-line argument.

## Opening an existing QA Hub

1. Connect to Oracle VPN.
2. Open the internal URL printed by the installer, normally `https://<INTERNAL_DNS_NAME>:32443/`.
3. Use the report account for the landing page and report areas.
4. Open `/jenkins/` and use the Jenkins account for test execution.

To print the non-secret access information again from the VM:

```bash
cd common/qa-automation/deploy/vm
bash scripts/access-info.sh
```

## Run the weekly PAR audit

1. Open **LiveLabs PAR audit** in Jenkins.
2. Select **Build with Parameters**.
3. Keep `CATALOG_MAX_PAGES=250` and leave `CATALOG_MAX_ITEMS` blank to crawl every catalog item.
4. Keep the other defaults unless a test maintainer asks for a diagnostic override.
5. Select **Build**.
6. Open `/par/` when the build completes.

Start with `par-catalog-not-working.csv`. It contains confirmed non-working PAR links discovered in workshops and LiveStacks. Review `par-unverified.csv` and `par-scan-incomplete.csv` separately because temporary network or source-fetch problems are not automatically labeled as broken links.

No `par-links.json` file is needed. The job discovers links directly from the crawled catalog content.

## Run the nightly or targeted regression

1. Open **LiveLabs overall regression** in Jenkins.
2. Select **Build with Parameters**.
3. Leave `CATALOG_MAX_ITEMS` and `CATALOG_ITEM_IDS` blank for the complete catalog.
4. For a targeted rerun, enter comma-separated generated item IDs in `CATALOG_ITEM_IDS`.
5. Select **Build**.
6. Open `/regression/` when the build completes.

The generated HTML report is for human triage. `results.csv` is the concise machine-readable output for later automation or Codex analysis.

## Updating the VM

After approved changes reach `main`:

```bash
cd common
git pull --ff-only
cd qa-automation/deploy/vm
bash install.sh \
  --private-address <VM_PRIVATE_IP> \
  --host <INTERNAL_DNS_NAME> \
  --skip-packages
```

The update rebuilds the local container images and retains Jenkins history, reports, and secrets in their existing volumes/files.

## Checks and troubleshooting

```bash
cd common/qa-automation/deploy/vm
bash scripts/healthcheck.sh
bash scripts/compose.sh ps
bash scripts/compose.sh logs --tail=200 jenkins
bash scripts/compose.sh logs --tail=200 portal
sudo systemctl status livelabs-qa.service
```

If the page cannot be reached:

1. Confirm the workstation is connected to Oracle VPN.
2. Confirm internal DNS resolves to the VM private IP.
3. Confirm the OCI NSG and host firewall allow only the approved VPN CIDR to TCP `32443`.
4. Run `scripts/healthcheck.sh` on the VM.
5. Check the portal and Jenkins container logs.

A browser certificate warning is expected only during initial inspection with the temporary self-signed certificate. It is not the intended steady state.

## Security rules

* Never assign a public IP to this QA Hub VM.
* Never bind the portal to `0.0.0.0`.
* Do not expose standard service ports such as `22`, `80`, `443`, `8080`, or `8443`.
* Publish only `32222` for private SSH and `32443` for the private QA portal; keep internal container ports private.
* Do not start Jenkins unless CrowdStrike Falcon is configured and active.
* Never commit `.env`, `deploy/vm/secrets/`, credentials, TLS private keys, or raw PAR URLs.
* Use an OCI instance principal for optional private Object Storage publishing.
* Back up the Jenkins and report volumes according to the VM backup policy.
