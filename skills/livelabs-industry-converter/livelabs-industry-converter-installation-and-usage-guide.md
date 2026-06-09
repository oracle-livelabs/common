# LiveLabs Industry Converter Installation And Use Guide

## What The Skill Can Do

- convert an existing Oracle LiveLabs workshop into an industry-specific variant
- infer lab order, manifests, launch files, and replacement terminology
- run strict LiveLabs and prose checks and produce a QA summary

## Core Rules

- preserve technical truth while adapting examples and narrative context
- detect and remove leftover source-industry vocabulary
- validate manifests and launch files after conversion
- report changed files and unresolved assumptions

## Installation Process

Give Codex this prompt:

```text
Install `livelabs-industry-converter` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `livelabs-industry-converter` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$livelabs-industry-converter` and give Codex the target path or content.

## What To Include In Your Request

- source workshop root
- target industry and business scenario
- output folder or branch expectations
- terms to preserve or avoid
- validation level expected

## Recommended Prompt Patterns

### Convert A Workshop

```text
$livelabs-industry-converter convert <source-workshop-root> into a healthcare version under <target-workshop-root>
```

### Review A Conversion

```text
$livelabs-industry-converter QA this converted workshop for leftover retail terms and LiveLabs structure problems: <converted-workshop-root>
```

## Common Pitfalls

- changing product behavior while changing only the industry context
- missing launch or manifest updates
- leaving old industry names in examples, screenshots, or filenames
- not separating generated issues from pre-existing workshop issues

## Expected Output From Codex

- conversion plan
- file mapping
- rewritten labs and manifests
- leftover vocabulary check
- validation and prose QA summary

## Quick Checklist

- embedded name is `livelabs-industry-converter`
- source and target industry are explicit
- output folder is separate or intentionally in-place
- QA summary checks leftover vocabulary

## Versioning History

- version 1.0 - 05/11/26
