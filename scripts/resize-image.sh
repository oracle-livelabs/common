#!/usr/bin/env bash
set -euo pipefail

MAX=1280

find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -print0 |
while IFS= read -r -d '' f; do
  [[ -f "$f" ]] || continue

  # Read dimensions
  read -r w h < <(
    ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
      -of default=noprint_wrappers=1:nokey=1 "$f" | tr '\n' ' '
  )

  # Skip if already within bounds (no re-encode)
  if [[ "${w:-0}" -le "${MAX}" && "${h:-0}" -le "${MAX}" ]]; then
    echo "Skipping (already <= ${MAX}px): $f (${w}x${h})"
    continue
  fi

  ext="${f##*.}"
  base="${f%.*}"
  ext_lc="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  tmp="${base}.tmp.${ext_lc}"

  echo "Resizing: $f (${w}x${h} -> max ${MAX}px)"

  ffmpeg -loglevel error -nostdin -i "$f" \
    -vf "scale='min(iw,${MAX})':'min(ih,${MAX})':force_original_aspect_ratio=decrease" \
    -y "$tmp" || { echo "Failed on: $f" >&2; rm -f "$tmp"; continue; }

  mv -f "$tmp" "$f"
done
