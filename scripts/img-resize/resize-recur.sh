#!/bin/bash

# run this script in the root directopry of a workshop to recursivley resize all larger images to max 1920px
# you need to have ffmpeg installed. Should work on Linux and Mac

find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -print0 |
while IFS= read -r -d '' f; do
  ext="${f##*.}"
  base="${f%.*}"
  ext_lc="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  tmp="${base}.tmp.${ext_lc}"

  echo "Resizing: $f"
  ffmpeg -loglevel error -nostdin -i "$f" \
    -vf "scale='min(iw,1920)':'min(ih,1920)':force_original_aspect_ratio=decrease" \
    -y "$tmp" || {
      echo "Failed on: $f" >&2
      continue
    }

  mv -f "$tmp" "$f"
done

