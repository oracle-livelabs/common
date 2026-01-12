#!/usr/bin/env bash
set -euo pipefail

MAX=1280

bytes_before_total=0
bytes_after_total=0
count_resized=0
count_skipped=0
count_failed=0
count_optimized=0

has_oxipng=0
if command -v oxipng >/dev/null 2>&1; then
  has_oxipng=1
fi

# Recursively find images (exclude .git just to be safe)
find . \
  -type f \
  \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) \
  -not -path "./.git/*" \
  -print0 |
while IFS= read -r -d '' f; do
  [[ -f "$f" ]] || continue

  # Track original size
  size_before="$(wc -c <"$f" | tr -d '[:space:]')"
  bytes_before_total=$((bytes_before_total + size_before))

  # Read dimensions safely (single-line output: WxH)
  dims="$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height \
    -of csv=p=0:s=x "$f" || true)"

  if [[ -z "$dims" ]]; then
    echo "Skipping (ffprobe failed): $f"
    bytes_after_total=$((bytes_after_total + size_before))
    count_failed=$((count_failed + 1))
    continue
  fi

  w="${dims%x*}"
  h="${dims#*x}"

  # Skip if already within bounds (no re-encode)
  if [[ "$w" -le "$MAX" && "$h" -le "$MAX" ]]; then
    echo "Skipping (already <= ${MAX}px): $f (${w}x${h})"
    bytes_after_total=$((bytes_after_total + size_before))
    count_skipped=$((count_skipped + 1))
    continue
  fi

  ext="${f##*.}"
  base="${f%.*}"
  ext_lc="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  tmp="${base}.tmp.${ext_lc}"

  echo "Resizing: $f (${w}x${h} → max ${MAX}px)"

  if [[ "$ext_lc" == "jpg" || "$ext_lc" == "jpeg" ]]; then
    # JPEG: controlled lossy compression (high quality)
    ffmpeg -loglevel error -nostdin -i "$f" \
      -vf "scale='min(iw,${MAX})':'min(ih,${MAX})':force_original_aspect_ratio=decrease" \
      -q:v 2 \
      -y "$tmp" || {
        echo "Failed on: $f" >&2
        rm -f "$tmp"
        bytes_after_total=$((bytes_after_total + size_before))
        count_failed=$((count_failed + 1))
        continue
      }
  else
    # PNG: resize losslessly, then optimize with oxipng (if available)
    ffmpeg -loglevel error -nostdin -i "$f" \
      -vf "scale='min(iw,${MAX})':'min(ih,${MAX})':force_original_aspect_ratio=decrease" \
      -compression_level 9 -pred mixed \
      -y "$tmp" || {
        echo "Failed on: $f" >&2
        rm -f "$tmp"
        bytes_after_total=$((bytes_after_total + size_before))
        count_failed=$((count_failed + 1))
        continue
      }

    if [[ "$has_oxipng" -eq 1 ]]; then
      # -o 4 is a good default (solid savings, not painfully slow)
      # --strip safe removes safe-to-remove metadata chunks
      oxipng -o 4 --strip safe "$tmp" >/dev/null 2>&1 || true
      count_optimized=$((count_optimized + 1))
    fi
  fi

  size_after="$(wc -c <"$tmp" | tr -d '[:space:]')"
  bytes_after_total=$((bytes_after_total + size_after))

  # Show per-file delta
  delta=$((size_before - size_after))
  if [[ "$delta" -ge 0 ]]; then
    printf "  Saved: %.2f MB (%d bytes)\n" "$(awk "BEGIN{print $delta/1048576}")" "$delta"
  else
    printf "  Grew:  %.2f MB (%d bytes)\n" "$(awk "BEGIN{print (-1*$delta)/1048576}")" "$delta"
  fi

  mv -f "$tmp" "$f"
  count_resized=$((count_resized + 1))
done

# Print totals
total_delta=$((bytes_before_total - bytes_after_total))

echo ""
echo "================ Summary ================"
echo "Resized:     $count_resized"
echo "Skipped:     $count_skipped"
echo "Failed:      $count_failed"
if [[ "$has_oxipng" -eq 1 ]]; then
  echo "PNG optimized (oxipng): $count_optimized"
else
  echo "PNG optimized (oxipng): 0 (oxipng not installed)"
fi
printf "Before:      %.2f MB\n" "$(awk "BEGIN{print $bytes_before_total/1048576}")"
printf "After:       %.2f MB\n" "$(awk "BEGIN{print $bytes_after_total/1048576}")"
if [[ "$total_delta" -ge 0 ]]; then
  printf "Saved:       %.2f MB\n" "$(awk "BEGIN{print $total_delta/1048576}")"
else
  printf "Net grew:    %.2f MB\n" "$(awk "BEGIN{print (-1*$total_delta)/1048576}")"
fi
echo "========================================="
