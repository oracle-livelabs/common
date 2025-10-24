#!/bin/bash

# run this script in the root directopry of a workshop to recursivley resize all images larger than 1mb
# you need to have ffmpeg installed. Should work on Linux and Mac

find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -size +1M -print0 |
while IFS= read -r -d '' f; do
  ext="${f##*.}"
  base="${f%.*}"
  ext_lc="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  tmp="${base}.tmp.${ext_lc}"

  echo "Resizing: $f"
  ffmpeg -loglevel error -nostdin -i "$f" -vf "scale=iw/2:ih/2" -y "$tmp" || {
    echo "Failed on: $f" >&2
    continue
  }

  mv -f "$tmp" "$f"
done
