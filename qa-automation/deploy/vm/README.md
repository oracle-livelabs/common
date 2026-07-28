# LiveLabs QA Service Deployment

This directory packages the QA test service for an approved private VM. It is intentionally environment-neutral because the repository is public.

The repository does not contain:

- tenancy, compartment, subnet, CIDR, DNS, address, or assigned port values;
- identity-provider tenant details or group names;
- passwords, API keys, client secrets, TLS private keys, PAR tokens, or session values;
- internal provisioning commands or corporate security artifacts.

Those values belong in the approved internal provisioning record and OCI Vault.

## Security boundary

The service fails closed unless all of these controls are available:

- an approved private VM and private network path;
- an active CrowdStrike Falcon sensor;
- corporate OpenID Connect registration with assigned QA Hub groups;
- an OCI instance principal allowed to read only the required Vault secrets;
- an internal CA certificate and private key stored in OCI Vault;
- an approved, digest-pinned corporate SSO proxy container image;
- approved non-standard service ports supplied during deployment;
- private report storage and the normal VM backup policy.

No local Jenkins administrator or shared report password is generated. Jenkins uses corporate SSO and group-based roles. The report portal uses the same SSO registration. Anonymous access and self-registration are disabled.

## Identity roles

The IdP registration must provide three groups through its `groups` claim:

| Role | Access |
| --- | --- |
| Administrator | Manage Jenkins configuration and security |
| Operator | Run, cancel, and inspect QA jobs |
| Viewer | Read jobs, results, reports, and CSV output |

Use named corporate identities. Do not distribute shared accounts.

## Vault inputs

Copy `.env.example` to the ignored `.env` file and set only approved configuration values and Vault secret OCIDs. Required Vault entries are:

- OIDC client secret;
- OIDC proxy cookie secret;
- internal TLS certificate;
- internal TLS private key.

Private-content LiveLabs credentials are optional and must use their own Vault entries. The installer retrieves the current secret versions through the VM instance principal and never prints their values.

The ignored local material is written under `deploy/vm/secrets/` with owner-only permissions. It is consumed as container secrets and must never be copied into reports, Object Storage, logs, or source control.

## Deployment

The infrastructure provisioner must first complete the private VM, networking, CrowdStrike, OIDC application, IdP groups, Vault, TLS, and IAM setup documented internally.

On the VM:

1. Clone the approved repository and branch.
2. Copy `.env.example` to `.env`.
3. Enter the approved generic configuration and Vault secret OCIDs.
4. Run `bash install.sh --help` and supply the approved private values from the internal provisioning record.
5. Confirm that the health check succeeds and that corporate SSO is required before any QA page opens.

The installer rejects public bind addresses, common service ports, missing SSO settings, missing Vault secrets, invalid TLS material, and an inactive CrowdStrike sensor.

## Operation

The portal presents two operator workflows:

- PAR audit;
- overall regression.

Reports and CSV files remain separated by workflow. Jenkins configuration, report history, and local secret files persist across service restarts. Back up the Jenkins and report volumes according to the approved VM policy.

To print non-secret access URLs from an authorized VM session:

```bash
bash scripts/access-info.sh
```

This command prints no credentials, secret OCIDs, group names, or identity-provider details.

## Updates

Pull only an approved branch, review changes, and restart through the managed service. Startup refreshes the current Vault secret versions before containers launch, which supports secret rotation without committing configuration.

Never add real deployment values to examples, screenshots, bug reports, presentation material, or public documentation.
