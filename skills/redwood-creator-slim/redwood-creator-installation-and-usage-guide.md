# Redwood Creator Installation And Use Guide

## What The Skill Can Do

- create Redwood-aligned UI guidance, critiques, and implementation specs
- choose the correct lane for app UI, brand/marketing work, or mixed outputs
- use packaged Redwood references, visual taxonomy, selected PNG examples, and Oracle Sans fonts
- produce build specs with `Anatomy`, `States`, `Tokens`, `Accessibility`, and `JET mapping`

## Core Rules

- derive guidance only from files inside the installed skill package
- use Oracle JET and Redwood UI patterns for application interfaces
- use Redwood brand colors from `references/redwood-brand-colors.md`
- keep marketing icons out of app control chrome, navigation, forms, and data controls
- treat this as a slim package: guideline PDFs and ZIP asset bundles are not bundled

## Installation Process

Give Codex this prompt:

```text
Install `redwood-creator-slim.zip` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `redwood-creator` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$redwood-creator` and describe the Redwood UI, critique, or implementation-spec task.

## What To Include In Your Request

- target artifact type, such as app screen, dashboard, page header, form, card, or branded visual
- intended lane: App UI, Brand/marketing, or Mixed
- audience, workflow, and target surface
- required sections, components, states, accessibility concerns, and visual constraints
- whether you want critique, build-spec output, or concise ingestion labels

## Recommended Prompt Patterns

### Create A Redwood Build Spec

```text
$redwood-creator create a Redwood build spec for an analytics dashboard with a page header, filter disclosure, KPI cards, chart area, and governed table. Include Anatomy, States, Tokens, Accessibility, and JET mapping.
```

### Critique A UI

```text
$redwood-creator critique this application screen for Redwood and Oracle JET compliance. Report What works, What to fix, and Redwood-aligned replacement guidance.
```

### Route Brand And App UI Work

```text
$redwood-creator review this mixed artifact. Keep app controls in the App UI lane and any illustration or collateral content in the Brand lane.
```

## Common Pitfalls

- expecting the slim package to include the removed guideline PDFs or ZIP asset bundles
- using Redwood marketing pictograms as app navigation or form-control icons
- mixing non-JET component libraries into Oracle JET app UI without stating the exception
- ignoring accessibility, states, and JET mapping in build-spec requests

## Expected Output From Codex

- lane decision and source files used when relevant
- Redwood critique or build-spec sections matching the requested mode
- color, typography, component, and icon guidance tied to packaged references
- accessibility notes and Oracle JET mapping for application UI work
- assumptions or missing inputs when the request needs more source context

## Quick Checklist

- embedded name is `redwood-creator`
- package ZIP exists as `redwood-creator-slim.zip`
- install folder should be `redwood-creator`
- request uses packaged references only
- output mode is clear: ingestion, critique, or build-spec

## Versioning History

- version 1.0 - 05/11/26
