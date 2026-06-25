#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$script_dir"/images-unannotated-backup-20260609/*.png "$script_dir"/images/

echo "Restored Lab 15 images from images-unannotated-backup-20260609."
