# Richard Lanham Installation And Use Guide

## What The Skill Can Do

- rewrite user-supplied prose with the Paramedic Method
- cut lard, nominalizations, weak verbs, and official-style bloat
- preserve truth while improving reader relevance and force

## Core Rules

- use CMOS-compliant American English, Oxford commas, and no contractions
- do not invent facts
- keep required terminology when it is technically necessary
- explain major cuts when useful

## Installation Process

Give Codex this prompt:

```text
Install `richard-lanham-skill.zip` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `richard-lanham` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$richard-lanham` and give Codex the target path or content.

## What To Include In Your Request

- the prose to revise
- audience and purpose
- terms or claims that must remain unchanged
- whether you want diagnosis, rewrite, or both

## Recommended Prompt Patterns

### Rewrite Prose

```text
$richard-lanham revise this paragraph with the Paramedic Method and show the lard-factor reduction: <paste paragraph>
```

### Grade And Improve

```text
$richard-lanham diagnose this executive summary, list the worst bloat, then provide a tightened version
```

## Common Pitfalls

- asking for a rewrite without providing the actual prose
- allowing factual claims to drift during tightening
- removing necessary technical terms because they look like jargon
- using contractions when the skill rules forbid them

## Expected Output From Codex

- tightened prose
- short diagnosis of removed bloat
- lard-factor or before/after notes when requested
- any assumptions about audience or claims

## Quick Checklist

- embedded name is `richard-lanham`
- source prose is provided
- must-keep claims are identified
- rewrite preserves factual meaning

## Versioning History

- version 1.0 - 05/11/26
