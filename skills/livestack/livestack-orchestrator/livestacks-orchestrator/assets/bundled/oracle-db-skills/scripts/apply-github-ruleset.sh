#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <owner> <repo> [ruleset-json]" >&2
  echo "Example: $0 krisrice oracle-db-skills .github/rulesets/main.json" >&2
  exit 1
fi

OWNER="$1"
REPO="$2"
RULESET_FILE="${3:-.github/rulesets/main.json}"

if [[ ! -f "$RULESET_FILE" ]]; then
  echo "Ruleset file not found: $RULESET_FILE" >&2
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "GITHUB_TOKEN is not set. Export a token with repo admin permissions." >&2
  exit 1
fi

API="https://api.github.com/repos/${OWNER}/${REPO}/rulesets"

curl --fail --silent --show-error \
  -X POST "$API" \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  --data-binary "@${RULESET_FILE}" \
  >/tmp/ruleset-create-response.json

echo "Ruleset created successfully for ${OWNER}/${REPO}."
echo "Response saved to /tmp/ruleset-create-response.json"
