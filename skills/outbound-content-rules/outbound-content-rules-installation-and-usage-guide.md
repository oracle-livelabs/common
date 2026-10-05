# Outbound Content Rules Installation And Use Guide

## What The Skill Can Do

- draft, revise, and grade outbound PM content
- apply concise active language, Lanham-style cuts, and defensible claims
- run grading, revision, or lard-factor analysis modes

## Core Rules

- keep claims truthful and specific
- remove jargon and official-style bloat
- preserve required product facts and legal constraints
- state what changed and why when revising

## Installation Process

Give Codex this prompt:

```text
Install `outbound-content-rules` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `outbound-content-rules` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$outbound-content-rules` and give Codex the target path or content.

## What To Include In Your Request

- content type and audience
- draft text or source notes
- whether you want grading, revision, or lard-factor mode
- must-keep product claims, terminology, or legal text

## Recommended Prompt Patterns

### Revise Launch Copy

```text
$outbound-content-rules revise this launch announcement for concise active PM writing while preserving technical claims: <paste copy>
```

### Grade A Draft

```text
$outbound-content-rules grade this web copy against outbound PM content rules and list the highest priority fixes
```

## Common Pitfalls

- asking for punchier copy without source facts
- removing legally required wording by accident
- turning technical claims into unsupported marketing claims
- mixing grading and final rewrite when you only wanted one mode

## Expected Output From Codex

- revised copy or graded findings
- lard-factor or clarity notes when requested
- changed claim wording
- remaining risks or facts needing verification

## Quick Checklist

- embedded name is `outbound-content-rules`
- mode is clear
- must-keep facts are listed
- output calls out risky or unsupported claims

## Versioning History

- version 1.0 - 05/11/26
