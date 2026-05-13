# Support Matrix

Version: see [`VERSION`](./VERSION)

This document is the public-facing support and prerequisites matrix for `livestacks-orchestrator`.

Use it to answer four questions quickly:

1. Can I install this skill in my Codex environment?
2. Can I author LiveStacks bundles with it on my machine?
3. Can I run the generated bundles locally?
4. Which helpers are optional rather than required?

## Support Scope

The package has three separate support surfaces:

1. Skill package support
2. Bundle authoring support
3. Generated bundle runtime support

Those are related, but they are not the same thing.

## Matrix

| Area | Status | Required | Optional | Notes |
| --- | --- | --- | --- | --- |
| Skill package install | Supported | Codex skill runtime, local filesystem access, `python3` | none | Install under `$CODEX_HOME/skills/livestacks-orchestrator` or `~/.codex/skills/livestacks-orchestrator`. |
| Skill self-update | Supported, fail-soft | `python3`, `git`, network access to the public GitHub repo | none | Run `python3 scripts/self_update.py --auto --json`; if GitHub, `git`, or validation is unavailable, the current local skill remains in place. |
| Skill package use without companion skills | Supported | same as above | none | The orchestrator can install bundled `oracle-db-skills`, `livestack-guide-builder`, and `redwood-creator` when they are missing. |
| LiveStacks bundle authoring | Supported | `python3`, `podman`, `podman compose` | `bash`-compatible shell, PowerShell for Windows wrapper review | Authoring means generating and validating a real `stack/`, `database/`, and `guide/` bundle. |
| Compose contract validation | Supported | `podman compose` | none | Production-ready bundles are expected to pass `podman compose config`. |
| A+ grading gate | Supported | `python3` | none | Generated bundles only pass when `scripts/grade_livestack_bundle.py <solution-root>` reports `A+` and `Pass: yes`. |
| Guide scaffold generation | Supported | `python3` | bundled or installed `livestack-guide-builder` | Generates LiveStack demo runbooks with desktop, sandbox, and tenancy workshop variants. |
| Guide markdown validation | Conditionally supported | external LiveLabs markdown validator installation | none | The validator is not bundled by this package. |
| Automated screenshot capture | Optional | none | installed `$playwright` or `$webapp-testing` | Screenshot helpers are intentionally not auto-installed. |
| Oracle database specialist guidance | Supported | none beyond base install | installed or bundled `oracle-db-skills` | Falls back to bundled Oracle reference guidance if install is unavailable or fails. |
| Redwood / Oracle JET UI guidance | Supported | none beyond base install | installed or bundled `redwood-creator` | Falls back to built-in UI/UX guidance if install is unavailable or fails. |
| Generated bundle local runtime | Supported by generated output contract | local container engine compatible with `podman compose` | host shell for Ollama bootstrap wrappers | Generated bundles target a Podman-first contract with `db`, `ords`, `app`, and `ollama`. |
| Oracle Linux 9 portability target | Design target | Podman-compatible Oracle Linux 9 host for validation | none | Generated compose output is intended to remain portable to Oracle Linux 9. |
| Windows as primary authoring platform | Not primary target | none | PowerShell for generated wrappers | This package emits PowerShell wrappers for generated bundles, but the skill itself is documented and validated primarily around `python3` and Podman-style workflows. |
| Docker-specific support | Out of scope for release contract | none | user-managed compatibility testing | Some generated artifacts may work with Docker-compatible tooling, but the package contract is Podman-first. |
| Auto-install of browser tooling | Not supported | none | manual install by operator | Browser and Node prerequisites vary too much by machine. |

## Required Tools

For the skill package itself:

- Codex skill runtime
- local filesystem access
- `python3`
- `git` and public GitHub network access for automatic self-update checks

For authoring production-ready LiveStacks bundles:

- `podman`
- `podman compose`

For guide validation outside the built-in validators:

- an approved local installation of the LiveLabs markdown validator

## Optional Tools

- `$playwright`
- `$webapp-testing`
- local Oracle-specific tooling used to validate generated database artifacts against real Oracle environments
- PowerShell, when reviewing or exercising the generated Windows Ollama bootstrap wrapper

## Bundled Dependencies

This package can self-provision these companion skills into the local Codex skills root:

- `oracle-db-skills`
- `livestack-guide-builder`
- `redwood-creator`

Helper installers:

- `scripts/ensure_oracle_db_skill.py`
- `scripts/ensure_livestack_guide_builder.py`
- `scripts/ensure_redwood_creator.py`
- `scripts/check_skill_package.py` validates package metadata, required paths, Python script syntax, and cache or macOS metadata hygiene before sharing or bundling.
- `scripts/self_update.py` checks the public GitHub `main` copy of this skill, validates a staged copy, and installs it automatically when content differs.

## Generated Bundle Expectations

The default generated bundle contract assumes:

- `db`, `ords`, `app`, and `ollama` services
- fixed published ports in `compose.yml`
- no `APP_PORT`, `DB_PORT`, `ORDS_PORT`, or `OLLAMA_PORT` in `.env` or `.env.example`
- the canonical ORDS bind mount `./ords-config:/etc/ords/config:Z,U`
- Oracle JET / Redwood app surfaces by default
- ORDS-first application APIs
- a visible Oracle evidence surface
- an interactive `operator_workbench` first screen for sparse briefs unless the working PRD justifies another story mode
- `Upload Your Own Data` as a first-iteration dataset-admin flow when demo data is replaceable
- `ADMIN_TOKEN` or a documented equivalent auth boundary for destructive dataset-admin routes
- documented exceptions for any direct app-to-database runtime access; ordinary business APIs remain ORDS-first
- Oracle Sans, restrained Redwood app geometry, documented Redwood colors, and JET-style icons for app navigation, controls, status, dataset work, and Oracle Internals
- a LiveStack demo runbook guide with required `desktop`, `sandbox`, and `tenancy` workshop variants
- red/green test evidence in `validation/test-evidence.md`
- final A+ grading with golden-core parity through `scripts/grade_livestack_bundle.py`

## Internal Beta Distribution Notes

For the companion macOS builder app, distribute the zip archive rather than the raw app folder:

```text
build-livestack-app/dist/BuildLiveStack-macos.zip
```

The current packaged app is ad hoc signed and not notarized. Recipients may need to use right-click `Open` or approve the app through macOS Security & Privacy.

Generated-stack runtime can still be blocked by local machine prerequisites outside this package, especially:

- missing or stopped Podman machine
- first-time Oracle Database, ORDS, Ollama, or app image pulls
- Oracle Container Registry terms or authentication requirements
- corporate certificate or proxy interception affecting npm, Docker Hub, or Oracle Container Registry pulls

## Not Bundled By This Package

- the LiveLabs markdown validator
- browser automation runtimes and browsers
- a full Oracle runtime installation outside what generated bundles themselves may reference
- approval for public redistribution of all bundled Oracle-branded assets

## Support Boundaries

This package is intended to be portable, but the support contract is intentionally narrow:

- It supports generating a Podman-first LiveStacks bundle.
- It supports validating scaffold completeness and semantic bundle consistency with the included Python scripts.
- It does not guarantee every external helper tool is already installed on the target machine.
- It does not claim Docker-first support, Kubernetes deployment support, or managed-cloud deployment support as part of the base public package contract.

## Recommended Public Beta Environment

If you want the least-friction authoring environment for the current package:

- Codex with local skill support
- `python3`
- `podman`
- `podman compose`
- a local shell environment capable of running the included helper commands

## Verification Path

For a generated solution bundle, the expected verification path is:

1. `python3 scripts/find_scaffold_markers.py <solution-root>`
2. `podman compose config` from `<solution-root>/stack`
3. `python3 scripts/validate_livestack_bundle.py <solution-root>`
4. `python3 scripts/grade_livestack_bundle.py <solution-root>`
5. local LiveLabs markdown validation for `<solution-root>/guide`

For the skill package itself, run:

1. `python3 scripts/check_skill_package.py`
2. `python3 -m unittest discover -s tests -p 'test_*.py'`
3. `python3 scripts/self_update.py --check-only --json`
