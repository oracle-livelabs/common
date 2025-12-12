#!/usr/bin/env bash
set -euo pipefail

MAX=1280

# Recursively find images (exclude .git just to be safe)
find . \
  -type f \
  \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) \
  -not -path "./.git/*" \
  -print0 |
while IFS= read -r -d '' f; do
  [[ -f "$f" ]] || continue

  # Read dimensions safely (single-line output: WxH)
  dims="$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height \
    -of csv=p=0:s=x "$f" || true)"

  if [[ -z "$dims" ]]; then
    echo "Skipping (ffprobe failed): $f"
    continue
  fi

  w="${dims%x*}"
  h="${dims#*x}"

  # Skip if already within bounds (no re-encode)
  if [[ "$w" -le "$MAX" && "$h" -le "$MAX" ]]; then
    echo "Skipping (already <= ${MAX}px): $f (${w}x${h})"
    continue
  fi

  ext="${f##*.}"
  base="${f%.*}"
  ext_lc="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  tmp="${base}.tmp.${ext_lc}"

  echo "Resizing: $f (${w}x${h} → max ${MAX}px)"

  ffmpeg -loglevel error -nostdin -i "$f" \
    -vf "scale='min(iw,${MAX})':'min(ih,${MAX})':force_original_aspect_ratio=decrease" \
    -y "$tmp" || {
      echo "Failed on: $f" >&2
      rm -f "$tmp"
      continue
    }

  mv -f "$tmp" "$f"
done
