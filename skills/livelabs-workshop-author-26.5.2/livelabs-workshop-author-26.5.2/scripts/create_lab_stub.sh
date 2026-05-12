#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  create_lab_stub.sh <workshop-root> <lab-slug> <lab-title> [estimated-time]

Examples:
  create_lab_stub.sh /path/to/my-workshop setup "Setup Environment" "10 minutes"
  create_lab_stub.sh /path/to/my-workshop ai-vector-search "Lab: AI Vector Search"
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 3 ]]; then
  usage
  exit 1
fi

WORKSHOP_ROOT="$1"
LAB_SLUG="$2"
LAB_TITLE="$3"
ESTIMATED_TIME="${4:-15 minutes}"

if [[ ! "${LAB_SLUG}" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Invalid lab slug '${LAB_SLUG}'. Use lowercase letters, numbers, and dashes only."
  exit 1
fi

LAB_DIR="${WORKSHOP_ROOT%/}/${LAB_SLUG}"
LAB_MD="${LAB_DIR}/${LAB_SLUG}.md"
IMAGES_DIR="${LAB_DIR}/images"

mkdir -p "${IMAGES_DIR}"

if [[ -e "${LAB_MD}" ]]; then
  echo "Lab markdown already exists: ${LAB_MD}"
  exit 1
fi

cat > "${LAB_MD}" <<EOF
# ${LAB_TITLE}

## Introduction

Describe what the learner will do in this lab and why it matters.

Estimated Time: ${ESTIMATED_TIME}

### Objectives

In this lab, you will:

- Complete the first outcome.
- Complete the second outcome.
- Verify the result.

## Task 1: Start Here

1. Add the first guided step.

## Acknowledgements

* **Author** - CHANGE ME
* **Last Updated By/Date** - CHANGE ME
EOF

echo "Created:"
echo "  ${LAB_MD}"
echo "  ${IMAGES_DIR}"
