# LiveStack LiveLabs Input Packager Installation And Use Guide

## What The Skill Can Do

- package a local industry LiveStack application into a portable LiveLabs Author input ZIP
- collect database source, frontend source, backend source, and generated API mapping
- exclude local runtime, dependency, build, cache, credential, wallet, and Git artifacts
- preserve source-relative paths so LiveLabs Author can trace generated workshop claims back to source files

## Core Rules

- never modify the source LiveStack application
- do not hard-code user names, absolute paths, industry names, or machine-specific directories
- create an input package with `database-source/`, `frontend-source/`, and backend mapping evidence
- use the bundled packaging script for deterministic output
- inspect the generated ZIP before handing it to LiveLabs Workshop Author

## Installation Process

Give Codex this prompt:

```text
Install `livestack-livelabs-input-packager.zip` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `livestack-livelabs-input-packager` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$livestack-livelabs-input-packager` and give Codex the stack path and output destination.

## What To Include In Your Request

- local LiveStack root path
- desired output directory or explicit output ZIP name
- expected industry or solution name, if it is not obvious from the folder name
- whether backend code exists or an API map should be generated
- any files that must be excluded beyond the default cleanup rules

## Recommended Prompt Patterns

### Package A Stack For LiveLabs Author

```text
$livestack-livelabs-input-packager package this LiveStack application into a LiveLabs Author INPUT_ZIP. Use this stack path: <stack-path>. Write the result to: <output-path>.
```

### Validate Generated Input ZIP

```text
$livestack-livelabs-input-packager inspect this generated input ZIP and confirm it contains database-source, frontend-source, backend-source or api-map.md, source-map.md, and README.md, with no local runtime or credential artifacts.
```

## Common Pitfalls

- packaging `node_modules`, build output, `.git`, `.env`, wallets, or local cache directories
- pointing LiveLabs Author at the source stack instead of the generated input ZIP
- omitting backend mapping evidence when no backend source directory exists
- using absolute machine-local paths inside generated package notes

## Expected Output From Codex

- generated `<industry>-stack-livelab-input.zip`
- source map describing included frontend, backend, and database files
- API map when backend routes can be inferred
- validation summary confirming required package folders and excluded artifact classes
- handoff values for `INPUT_ZIP` and `OUTPUT_DIR`

## Quick Checklist

- embedded name is `livestack-livelabs-input-packager`
- package ZIP exists as `livestack-livelabs-input-packager.zip`
- install folder should be `livestack-livelabs-input-packager`
- generated input ZIP contains required source folders
- no credential, wallet, dependency, build, cache, or Git artifacts are packaged

## Versioning History

- version 1.0 - 05/11/26
