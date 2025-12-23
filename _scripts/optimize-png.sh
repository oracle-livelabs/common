#!/usr/bin/env bash
set -euo pipefail

# oxipng optimization level (1–6 are practical; max is slower)
OXI_LEVEL=4

if ! command -v oxipng >/dev/null 2>&1; then
  echo "Error: oxipng is not installed."
  echo "  macOS:  brew install oxipng"
  echo "  Ubuntu: sudo apt-get install oxipng"
  exit 1
fi

bytes_before_total=0
bytes_after_total=0
count_optimized=0
count_skipped=0
count_failed=0

# Recursively find PNGs (exclude .git)
find . \
  -type f \
  -iname "*.png" \
  -not -path "./.git/*" \
  -print0 |
while IFS= read -r -d '' f; do
  [[ -f "$f" ]] || continue

  size_before="$(wc -c <"$f" | tr -d '[:space:]')"
  bytes_before_total=$((bytes_before_total + size_before))

  # Optimize in place (lossless)
  if ! oxipng -o "$OXI_LEVEL" --strip safe "$f" >/dev/null 2>&1; then
    echo "Failed: $f"
    bytes_after_total=$((bytes_after_total + size_before))
    count_failed=$((count_failed + 1))
    continue
  fi

  size_after="$(wc -c <"$f" | tr -d '[:space:]')"
  bytes_after_total=$((bytes_after_total + size_after))

  delta=$((size_before - size_after))

  if [[ "$delta" -gt 0 ]]; then
    printf "Optimized: %s (saved %.2f MB)\n" \
      "$f" "$(awk "BEGIN{print $delta/1048576}")"
    count_optimized=$((count_optimized + 1))
  else
    echo "No change: $f"
    count_skipped=$((count_skipped + 1))
  fi
done

total_delta=$((bytes_before_total - bytes_after_total))

echo ""
echo "============== PNG Optimization Summary =============="
echo "Optimized: $count_optimized"
echo "No change: $count_skipped"
echo "Failed:    $count_failed"
printf "Before:    %.2f MB\n" "$(awk "BEGIN{print $bytes_before_total/1048576}")"
printf "After:     %.2f MB\n" "$(awk "BEGIN{print $bytes_after_total/1048576}")"
if [[ "$total_delta" -ge 0 ]]; then
  printf "Saved:     %.2f MB\n" "$(awk "BEGIN{print $total_delta/1048576}")"
else
  printf "Net grew:  %.2f MB\n" "$(awk "BEGIN{print (-1*$total_delta)/1048576}")"
fi
echo "======================================================"
