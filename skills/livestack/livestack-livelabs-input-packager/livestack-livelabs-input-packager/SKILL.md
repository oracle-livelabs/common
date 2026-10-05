---
name: livestack-livelabs-input-packager
description: Package a local industry LiveStack application into a portable INPUT_ZIP for LiveLabs Workshop Author 26.5.2. Use when given a stack path and output directory and needing database-source, frontend-source, and backend-source or api-map.md without hard-coded local paths.
metadata:
  short-description: Create LiveLabs author INPUT_ZIP files from industry LiveStacks
---

# LiveStack LiveLabs Input Packager

Use this skill to turn an industry LiveStack checkout into a portable source package that can be fed into LiveLabs Workshop Author 26.5.2 as `INPUT_ZIP`.

## Contract

Inputs:

- `STACK_PATH`: path to the local industry LiveStack root.
- `OUTPUT_PATH`: directory where the zip should be placed. If the path ends in `.zip`, use it as the explicit output zip path.

Output:

- `<industry>-stack-livelab-input.zip`, where `<industry>` is derived from the stack directory name. For example, `finance-livestack` becomes `finance-stack-livelab-input.zip`.

The zip contains one top-level wrapper directory named like the zip stem. Inside it:

```text
<industry>-stack-livelab-input/
|-- database-source/
|-- frontend-source/
|-- backend-source/        # when backend code exists
|-- api-map.md             # generated route/API map when possible
|-- source-map.md          # generated source trace
`-- README.md              # brief package note for LiveLabs Author
```

The package must satisfy the LiveLabs Author source-input contract:

- `database-source/`
- `frontend-source/`
- at least one backend mapping source:
  - `backend-source/`
  - `api-reference/backend/server.js`
  - `api-map.md`

## Core rules

- Do not hard-code user names, absolute paths, industry names, or machine-specific directories.
- Never modify the source stack.
- Exclude local runtime, dependency, build, cache, credential, and wallet artifacts.
- Preserve source-relative paths inside the package so LiveLabs Author can trace frontend, backend, and database claims back to files.
- Prefer the bundled script for deterministic packaging.

## Run

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/livestack-livelabs-input-packager/scripts/package_livestack_input.py" \
  "$STACK_PATH" \
  "$OUTPUT_PATH"
```

## Validation

After packaging, inspect the zip listing:

```bash
unzip -l "$OUTPUT_ZIP" | sed -n '1,120p'
```

Confirm:

1. `database-source/` exists and includes schema/data SQL or related database files.
2. `frontend-source/` exists and includes frontend application source.
3. `backend-source/` and/or `api-map.md` exists.
4. No `.env`, wallet, `node_modules`, build output, `.git`, or machine-local cache directories were packaged.

## Handoff to LiveLabs Author

When invoking LiveLabs Workshop Author 26.5.2, provide only:

```text
INPUT_ZIP=<path-to-generated-zip>
OUTPUT_DIR=<path-to-workshop-output-dir>
```

Tell LiveLabs Author that the frontend is the learner-facing story, the database source is the technical truth, and the backend/API map shows how frontend interactions reach ORDS, Express, or other service routes.
