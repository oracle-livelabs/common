# LiveLabs QA VM Package

This folder deploys the existing `qa-automation` project as one private VM service. It does not create a custom OCI image and does not require the image-pilot or Marketplace repositories.

## What Runs

* `LiveLabs PAR audit`: weekly specialist scan for PAR links discovered across the complete LiveLabs catalog.
* `LiveLabs overall regression`: nightly generated catalog regression; the same job accepts item IDs for targeted reruns.
* `LiveLabs QA engine`: internal Jenkins execution job used by the two operator jobs.
* Private HTTPS portal:
    * `/par/` serves the latest and historical PAR audit reports.
    * `/regression/` serves the latest and historical overall reports.
    * `/jenkins/` is the authenticated operator console.

Each run writes HTML, JSON, Markdown, and `results.csv`. PAR runs also write dedicated broken, unverified, and incomplete-scan CSV files. Screenshots, traces, and other evidence referenced by the report are copied into the report folder, so the links work outside the Jenkins workspace.

The PAR job needs no manually maintained link file. It crawls the LiveLabs catalog and discovers the PAR links from each indexed workshop and LiveStack source.

The catalog currently classifies cards as `workshop` or `livestack`. Sprint-style
cards that use the workshop route are included in the run and reported in the
workshop group; they are not silently skipped.

## Security Boundary

* The only published host port is non-standard HTTPS port `32443`.
* Jenkins uses internal port `32080` and the portal uses internal port `32444`; neither is published directly.
* Administrative SSH must use the approved non-standard port `32222` and remain limited to the Oracle VPN CIDR.
* CrowdStrike Falcon must be installed, configured with the corporate CID, and active before the installer starts Jenkins.
* The default bind address is `127.0.0.1` for SSH-tunnel inspection.
* On a permanent VM, bind only to the VM private VPN address. Never use `0.0.0.0` on a public subnet.
* Jenkins disables anonymous access and self-signup.
* Report pages require a separate read-only HTTP Basic Auth account.
* LiveLabs credentials, TLS keys, and generated bootstrap secrets live under ignored `deploy/vm/secrets/` files.
* Object Storage publishing uses OCI instance principal by default. No OCI API key is stored in the repository or container environment.
* PAR tokens and LiveLabs session values are masked before report files are written.

Use an internal CA certificate before giving the URL to the team. The setup script creates only a 30-day self-signed certificate for initial inspection.

## VM Baseline

Recommended starting point for the full generated catalog:

* Oracle Linux 9 for the automated installation path
* 4 OCPUs
* 16 GB memory
* 80 GB boot volume
* Private subnet/VPN access
* Approved outbound HTTPS through an OCI NAT gateway or managed proxy
* Podman plus Podman Compose, or Docker plus Docker Compose
* Git, OpenSSL, and curl

For Oracle Linux:

```bash
sudo dnf install -y git openssl curl httpd-tools podman firewalld
sudo dnf install -y oracle-epel-release-el9 podman-compose
```

The one-command installer adds Oracle's `oracle-epel-release-el9` repository package only when a Compose provider is missing.

## First Deployment

The preferred path is the one-command Oracle Linux installer. Run it as the non-root account that owns the repository checkout:

```bash
cd common/qa-automation/deploy/vm
bash install.sh \
  --private-address <VM_PRIVATE_IP> \
  --host <INTERNAL_DNS_NAME> \
  --vpn-cidr <APPROVED_ORACLE_VPN_CIDR> \
  --crowdstrike-rpm /secure/falcon-sensor.rpm \
  --crowdstrike-cid-file /secure/falcon-cid
```

The installer first requires a configured and running CrowdStrike Falcon sensor. It can install a pre-staged corporate RPM using a CID file that remains outside the repository. Only after that check passes does it install the remaining host packages, create ignored local configuration and one-time credentials, build and start both container images, run the health check, configure restart after reboot, and print the URLs to open. It rejects public bind addresses and standard service ports.

When CrowdStrike is already installed and active in the base VM, omit both CrowdStrike options; the installer verifies the existing sensor instead. The Falcon RPM and CID must come from the approved corporate source and must never be committed or included in the QA ZIP.

Run `bash install.sh --help` for all options. The private address can be detected automatically when the VM has exactly one RFC1918 address. Omit `--host` when internal DNS is not ready. Omit `--vpn-cidr` when the host firewall is managed centrally.

The OCI administrator must still create the private subnet/VPN route, limit the NSG to the approved VPN CIDR, and provide internal DNS and a production internal-CA certificate. The installer does not weaken or guess those controls.

### Pre-merge inspection

The local deployment folder can be zipped and installed before a PR is opened. That starts the portal and Jenkins interface, but Jenkins clones its test code from Git. For a real run of unmerged tests, push the topic branch to a fork and set `QA_GIT_URL` and `QA_GIT_BRANCH` in the VM's ignored `.env`. A PR is not required. Restore the original repository and `*/main` before the VM is shared permanently.

The preparation step prints newly generated Jenkins and report credentials once. Store them in the approved secret manager. Optional LiveLabs sign-in values remain in these ignored files:

```text
secrets/livelabs-username
secrets/livelabs-secret
```

The generated 30-day self-signed certificate is for inspection only. Replace `secrets/tls.crt` and `secrets/tls.key` with an internal CA certificate before team use, then run:

```bash
bash scripts/compose.sh restart portal
bash scripts/healthcheck.sh
```

To print the non-secret access details again:

```bash
bash scripts/access-info.sh
```

For the complete OCI prerequisites, first-time setup, operator flow, updates, and troubleshooting, see [LiveLabs QA Hub VM](../../docs/runbooks/qa-hub-vm.md). A Confluence storage-format draft is available at [qa-hub-vm.storage.xml](../../docs/confluence/qa-hub-vm.storage.xml).

## Operator Flow

### Weekly PAR audit

1. Open `/jenkins/`.
2. Select `LiveLabs PAR audit`.
3. Use `Build with Parameters` for a manual run, or let the weekly schedule start it.
4. Open `/par/` after completion.
5. Start with `par-catalog-not-working.csv`.
6. Review `par-unverified.csv` and `par-scan-incomplete.csv` separately; those are not confirmed stale links.

### Nightly overall regression

1. Open `LiveLabs overall regression`.
2. Leave `CATALOG_ITEM_IDS` blank for the complete nightly catalog.
3. Enter comma-separated generated item IDs for a targeted rerun after a fix.
4. Open `/regression/` after completion.
5. Use `results.csv` for automation or future Codex analysis; use the HTML report for screenshots, traces, and human triage.

The homepage smoke suite is intentionally not part of either scheduled catalog job.

## Object Storage Publishing

Set these values in `.env`:

```text
QA_OBJECT_STORAGE_NAMESPACE=<namespace>
QA_OBJECT_STORAGE_BUCKET=<private-bucket>
QA_OBJECT_STORAGE_PREFIX=livelabs-qa
QA_OCI_AUTH_MODE=instance_principal
```

Grant the VM dynamic group only the permissions required for that private bucket. A tenancy administrator should scope the policy to the selected compartment and bucket. The Jenkins image includes OCI CLI; after each run it uploads only the sanitized report tree:

```text
livelabs-qa/par/latest/
livelabs-qa/par/runs/<run-id>/
livelabs-qa/regression/latest/
livelabs-qa/regression/runs/<run-id>/
```

The bucket must remain private. Give report readers access through the VPN portal or an approved private Object Storage access pattern, not a long-lived public PAR URL.

## Updating

After approved QA changes reach `main`:

```bash
git pull
cd qa-automation/deploy/vm
bash scripts/compose.sh up -d --build
bash scripts/healthcheck.sh
```

Back up the named `jenkins_home` and `qa_reports` volumes according to the VM backup policy. Never copy the `secrets` folder into report artifacts or Object Storage.
