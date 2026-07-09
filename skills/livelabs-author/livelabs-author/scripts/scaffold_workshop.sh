#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scaffold_workshop.sh <target-parent-dir> <workshop-slug> [--sample <sample-workshop-path>] [--title <workshop-title>] [--help <help-alias>] [--variants <csv>] [--no-need-help] [--force]

Examples:
  scaffold_workshop.sh /tmp my-ai-workshop
  scaffold_workshop.sh /tmp my-ai-workshop --sample /path/to/sample-workshop
  scaffold_workshop.sh /tmp my-ai-workshop --title "My AI Workshop" --help livelabs-help-db_us@oracle.com --variants sandbox,desktop
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

TARGET_PARENT_DIR="$1"
WORKSHOP_SLUG="$2"
shift 2

SAMPLE_WORKSHOP="${LIVELABS_SAMPLE_WORKSHOP:-}"
WORKSHOP_TITLE=""
HELP_ALIAS="livelabs-help-db_us@oracle.com"
VARIANTS_CSV="tenancy,sandbox,desktop"
INCLUDE_NEED_HELP=1
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sample)
      SAMPLE_WORKSHOP="${2:-}"
      if [[ -z "${SAMPLE_WORKSHOP}" ]]; then
        echo "--sample requires a path."
        exit 1
      fi
      shift 2
      ;;
    --title)
      WORKSHOP_TITLE="${2:-}"
      if [[ -z "${WORKSHOP_TITLE}" ]]; then
        echo "--title requires a value."
        exit 1
      fi
      shift 2
      ;;
    --help)
      HELP_ALIAS="${2:-}"
      if [[ -z "${HELP_ALIAS}" ]]; then
        echo "--help requires a value."
        exit 1
      fi
      shift 2
      ;;
    --variants)
      VARIANTS_CSV="${2:-}"
      if [[ -z "${VARIANTS_CSV}" ]]; then
        echo "--variants requires a comma-separated list."
        exit 1
      fi
      shift 2
      ;;
    --no-need-help)
      INCLUDE_NEED_HELP=0
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! "${WORKSHOP_SLUG}" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Invalid workshop slug '${WORKSHOP_SLUG}'. Use lowercase letters, numbers, and dashes only."
  exit 1
fi

mkdir -p "${TARGET_PARENT_DIR}"
DEST_DIR="${TARGET_PARENT_DIR%/}/${WORKSHOP_SLUG}"

if [[ -e "${DEST_DIR}" && "${FORCE}" -ne 1 ]]; then
  echo "Destination exists: ${DEST_DIR}"
  echo "Use --force to replace it."
  exit 1
fi

if [[ -e "${DEST_DIR}" && "${FORCE}" -eq 1 ]]; then
  rm -rf "${DEST_DIR}"
fi

create_default_workshop() {
  local dest_dir="$1"
  local workshop_title="${WORKSHOP_TITLE:-${WORKSHOP_SLUG//-/ }}"
  local variants_raw="${VARIANTS_CSV}"
  local variant
  local variant_dirs=()

  IFS=',' read -r -a variant_dirs <<< "${variants_raw}"
  if [[ ${#variant_dirs[@]} -eq 0 ]]; then
    echo "At least one variant is required."
    exit 1
  fi

  mkdir -p \
    "${dest_dir}/introduction/images"

  for variant in "${variant_dirs[@]}"; do
    variant="${variant// /}"
    if [[ -z "${variant}" ]]; then
      continue
    fi
    mkdir -p "${dest_dir}/workshops/${variant}"
  done

  cat > "${dest_dir}/introduction/introduction.md" <<EOF
# ${workshop_title}

## Introduction

State the learner problem, the environment, and the outcome. Do not mention the blog post, prompt, or authoring process.

### Prerequisites

- Replace with the minimum environment and access requirements.

### Objectives

- Understand the workshop goals.
- Prepare for the hands-on labs.

Estimated Workshop Time: 30 minutes

## Acknowledgements

* **Author** - TODO
* **Last Updated By/Date** - TODO
EOF

  for variant in "${variant_dirs[@]}"; do
    variant="${variant// /}"
    if [[ -z "${variant}" ]]; then
      continue
    fi

    cat > "${dest_dir}/workshops/${variant}/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Oracle LiveLabs gives you access to Oracle products so you can run hands-on labs and workshops in a guided environment.">
    <title>Oracle LiveLabs</title>

    <script src="https://livelabs.oracle.com/cdn/common/redwood-hol/js/jquery-1.11.0.min.js"></script>
    <script src="https://livelabs.oracle.com/cdn/common/redwood-hol/js/jquery-ui-1.10.4.custom.js"></script>
    <script src="https://livelabs.oracle.com/cdn/common/redwood-hol/js/main.min.js"></script>

    <link rel="stylesheet" href="https://livelabs.oracle.com/cdn/common/redwood-hol/css/style.min.css" />
    <link rel="shortcut icon" href="https://livelabs.oracle.com/cdn/common/redwood-hol/img/favicon.ico" />
</head>

<body>
    <header class="hol-Header" role="banner">
        <div class="hol-Header-wrap">
            <div class="hol-Header-logo"><span>Oracle LiveLabs</span></div>
            <a href="https://livelabs.oracle.com" target="_blank" id="livelabs" title="Oracle LiveLabs"></a>
            <div class="hol-Header-actions">
                <button id="openNav" class="hol-Header-button hol-Header-button--menu rightNav" aria-label="Open Menu"
                    title="Open Menu">
                    <span class="hol-Header-toggleIcon"></span>
                </button>
            </div>
        </div>
    </header>

    <div id="container">
        <div id="leftNav">
            <div id="toc"></div>
        </div>
        <div id="contentBox">
            <main class="hol-Content" id="module-content"></main>
        </div>
    </div>

    <footer class="hol-Footer">
        <a class="hol-Footer-topLink" href="#top">Return to Top</a>
        <div id="footer-banner">
            <div class="footer-row">
                <div class="footer-content">
                    <ul class="footer-links">
                        <li><a href="https://docs.oracle.com/pls/topic/lookup?ctx=en/legal&id=cpyr" target="_blank">© Oracle</a></li>
                        <li><a href="https://www.oracle.com/corporate/index.html" target="_blank">About Oracle</a></li>
                        <li><a href="https://www.oracle.com/corporate/contact/" target="_blank">Contact Us</a></li>
                        <li class="footer-links-break"></li>
                        <li><a href="https://docs.oracle.com/en/browseall.html" target="_blank">Products A-Z</a></li>
                        <li><a href="https://www.oracle.com/legal/privacy/" target="_blank">Terms of Use & Privacy</a></li>
                        <li><a href="https://www.oracle.com/legal/privacy/privacy-policy.html#11" target="_blank">Cookie Preferences</a></li>
                        <li><a href="https://www.oracle.com/legal/privacy/marketing-cloud-data-cloud-privacy-policy.html#adchoices" target="_blank">Ad Choices</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </footer>
</body>
</html>
EOF

    cat > "${dest_dir}/workshops/${variant}/manifest.json" <<EOF
{
  "workshoptitle": "${workshop_title}",
  "help": "${HELP_ALIAS}",
  "tutorials": [
    {
      "title": "Introduction",
      "description": "Workshop overview and objectives.",
      "type": "livelabs",
      "filename": "../../introduction/introduction.md"
    }$( [[ "${INCLUDE_NEED_HELP}" -eq 1 ]] && cat <<'JSON'
,
    {
      "title": "Need Help?",
      "description": "Template to link to Need Help lab at the end of workshop.",
      "filename": "https://raw.githubusercontent.com/oracle-livelabs/common/main/labs/need-help/need-help-freetier.md"
    }
JSON
)
  ]
}
EOF
  done
}

create_workshop_details_stub() {
  local dest_dir="$1"
  local details_path="${dest_dir}/WORKSHOP-DETAILS.md"

  if [[ -f "${details_path}" ]]; then
    return 0
  fi

  cat > "${details_path}" <<'EOF'
# Workshop Details

## Short Description

TODO: Write a 1-2 sentence summary for catalog or listing use.

## Long Description

TODO: Write a fuller 1-3 paragraph description that explains the learner problem, scope, and outcome.

## Workshop Outline

1. Introduction
2. Lab 1 - TODO
3. Lab 2 - TODO
4. Lab 3 - TODO

## Workshop Prerequisites

- TODO

## Notes

- Keep this file aligned with the final manifest and lab titles.
- Keep the long description learner-focused. Do not say the workshop was created from a blog, prompt, or source format.
EOF
}

if [[ -n "${SAMPLE_WORKSHOP}" ]]; then
  if [[ ! -d "${SAMPLE_WORKSHOP}" ]]; then
    echo "Sample workshop path not found: ${SAMPLE_WORKSHOP}"
    exit 1
  fi
  cp -R "${SAMPLE_WORKSHOP}" "${DEST_DIR}"
else
  create_default_workshop "${DEST_DIR}"
fi

create_workshop_details_stub "${DEST_DIR}"

# Remove template and desktop metadata noise from copied sample.
rm -f "${DEST_DIR}/howtouse-deletewhenfinished.md"
find "${DEST_DIR}" -name ".DS_Store" -type f -delete

echo "Workshop scaffold created at: ${DEST_DIR}"
