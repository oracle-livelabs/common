# Redwood Creator Installation And Use Guide

## What The Skill Can Do

- create and review Oracle JET / Redwood app UI guidance
- enforce Oracle Sans typography, Redwood color guidance, and JET glyph/icon rules
- keep generated UI in the Oracle JET app lane instead of generic design-system output
- provide lightweight local Redwood references without bundling large guideline PDFs or component ZIP archives

## Core Rules

- use the embedded `name:` value `redwood-creator` as the installed skill folder name
- keep the skill self-contained under the nested `redwood-creator` folder
- load only the local files under `references/`, `assets/`, and `manifests/`
- use Oracle JET components, Redwood theme variables, Oracle Sans fonts, and JET glyph classes for app UI work
- do not use Tailwind for this skill's app UI lane
- do not add heavyweight source PDFs, component ZIP archives, or screenshot images unless the skill scope is intentionally expanded

## Installation Process

Give Codex this prompt:

```text
Install the `redwood-creator` skill folder into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `redwood-creator` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$redwood-creator` and give Codex the target UI, page, app, or design review context.

## What To Include In Your Request

- the app or page path to review or build
- whether the output is critique, build spec, or implementation guidance
- the frontend stack and whether Oracle JET is available
- screenshots or current UI files when reviewing existing work
- accessibility, branding, or portal constraints that affect the UI

## Recommended Prompt Patterns

### Review A UI

```text
$redwood-creator review this dashboard for Oracle JET and Redwood alignment. Focus on typography, icon use, color, layout density, contrast, and responsive behavior.
```

### Build A UI Spec

```text
$redwood-creator create a Redwood/JET build spec for this feature. Include anatomy, states, tokens, typography, accessibility, and JET component mapping.
```

### Guide An Implementation

```text
$redwood-creator help update this app UI so it follows Oracle JET Redwood patterns. Keep the design restrained, rectangular, accessible, and portable.
```

## Common Pitfalls

- treating Redwood marketing icons as control or navigation icons
- using Tailwind utility classes instead of Oracle JET patterns
- relying on screenshot-derived component recreation instead of JET components
- adding large source archives that make the skill hard to publish and install
- using rounded-card or pill-heavy geometry without an explicit user request

## Expected Output From Codex

- clear Redwood/JET critique or implementation guidance
- JET component mapping where app UI is involved
- typography, color, icon, contrast, and responsive checks
- explicit callouts when a requested stack cannot be fully JET-compliant

## Quick Checklist

- embedded name is `redwood-creator`
- package ZIP contains a top-level `redwood-creator/` folder
- `SKILL.md` references only files included in the package
- `manifests/source-coverage.md` documents the slim app UI scope
- `redwood-creator.update.json` matches the ZIP hash and content hash

## Versioning History

- version 1.0 - 05/11/26
