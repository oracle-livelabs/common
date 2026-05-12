# LiveStack Guide Builder Installation And Use Guide

## What The Skill Can Do

- scaffold a LiveStack `guide/` folder with required LiveLabs workshop variants
- author scene-by-scene demo runbooks for working LiveStack applications
- keep desktop, sandbox, and tenancy manifests aligned with guide labs
- validate guide structure, copy markers, screenshots, manifests, and canonical workshop shells

## Core Rules

- create LiveStack guides only; do not use this as a generic LiveLabs workshop authoring skill
- base each scene lab on what the user sees, clicks, runs, inspects, or compares in the app
- keep `workshops/*/index.html` files as canonical LiveLabs shell files unless shell changes are explicitly requested
- use real screenshots when possible and record missing screenshots instead of fabricating them
- validate the finished guide with the bundled validator script

## Installation Process

Give Codex this prompt:

```text
Install `livestack-guide-builder` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `livestack-guide-builder` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$livestack-guide-builder` and give Codex the LiveStack app or solution root plus the guide task.

## What To Include In Your Request

- LiveStack solution root or app source location
- workshop title and business story
- visible scene sequence, routes, buttons, and expected state changes
- app URL, health route, archive name, and run or shutdown commands when known
- screenshot availability and any missing screenshot notes

## Recommended Prompt Patterns

### Scaffold A Guide

```text
$livestack-guide-builder scaffold a LiveStack guide for this solution. Title: <workshop-title>. Use the visible app scenes as labs and include desktop, sandbox, and tenancy workshop manifests.
```

### Validate A Guide

```text
$livestack-guide-builder validate this LiveStack guide and report missing labs, manifest drift, copy marker issues, screenshot references, and non-canonical workshop shells.
```

### Update Existing Labs

```text
$livestack-guide-builder update this existing guide so each scene lab matches the current app workflow, visible controls, expected outcomes, and business signals.
```

## Common Pitfalls

- writing generic architecture documentation instead of a demo runbook
- letting guide scenes drift from the real app
- customizing canonical workshop shell files without a specific requirement
- using placeholder screenshots without recording the capture gap
- updating only one manifest variant when all three must stay aligned

## Expected Output From Codex

- scaffolded or updated `guide/` folder
- scene labs with tasks, expected results, and business-outcome notes
- desktop, sandbox, and tenancy manifest updates
- screenshot inventory or missing-screenshot report
- validation summary from the bundled validator

## Quick Checklist

- embedded name is `livestack-guide-builder`
- package ZIP exists as `livestack-guide-builder.zip`
- install folder should be `livestack-guide-builder`
- generated guide includes required labs and all three workshop variants
- validator report is clean or remaining issues are documented

## Versioning History

- version 1.0 - 05/11/26
