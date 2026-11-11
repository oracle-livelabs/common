#!/usr/bin/env bash
set -euo pipefail

MAX=1280
DRY_RUN=0
PARALLEL_JOBS=4

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Resize and optimize images (JPG/PNG) in the current directory recursively.

Options:
  -n, --dry-run     Preview changes without modifying files
  -j, --jobs N      Number of parallel jobs (default: $PARALLEL_JOBS)
  -m, --max N       Maximum dimension in pixels (default: $MAX)
  -h, --help        Show this help message

Examples:
  $(basename "$0")              # Process all images
  $(basename "$0") -n           # Preview what would be done
  $(basename "$0") -j 8         # Use 8 parallel jobs
  $(basename "$0") -m 1920      # Resize to max 1920px
EOF
  exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--dry-run)
      DRY_RUN=1
      shift
      ;;
    -j|--jobs)
      PARALLEL_JOBS="$2"
      shift 2
      ;;
    -m|--max)
      MAX="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

has_oxipng=0
if command -v oxipng >/dev/null 2>&1; then
  has_oxipng=1
fi

# Create temp directory for results (used in parallel mode)
RESULTS_DIR="$(mktemp -d)"
trap 'rm -rf "$RESULTS_DIR"' EXIT

# Process a single file - outputs results to a temp file
process_file() {
  local f="$1"
  local MAX="$2"
  local DRY_RUN="$3"
  local has_oxipng="$4"
  local RESULTS_DIR="$5"
  # Use md5 on macOS, md5sum on Linux
  local hash
  if command -v md5sum >/dev/null 2>&1; then
    hash="$(echo "$f" | md5sum | cut -d' ' -f1)"
  else
    hash="$(echo "$f" | md5)"
  fi
  local result_file="$RESULTS_DIR/$hash"

  [[ -f "$f" ]] || return 0

  # Track original size
  local size_before size_after delta
  size_before="$(wc -c <"$f" | tr -d '[:space:]')"

  # Read dimensions safely (single-line output: WxH)
  local dims w h
  dims="$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height \
    -of csv=p=0:s=x "$f" 2>/dev/null || true)"

  if [[ -z "$dims" ]]; then
    echo "Skipping (ffprobe failed): $f"
    echo "failed:1:$size_before:$size_before" > "$result_file"
    return 0
  fi

  w="${dims%x*}"
  h="${dims#*x}"

  local ext base ext_lc tmp
  ext="${f##*.}"
  base="${f%.*}"
  ext_lc="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  tmp="${base}.tmp.$$.${ext_lc}"

  local needs_resize=0
  if [[ "$w" -gt "$MAX" || "$h" -gt "$MAX" ]]; then
    needs_resize=1
  fi

  local action=""
  local status="skipped"

  # For JPEGs: skip if already within bounds
  if [[ "$ext_lc" == "jpg" || "$ext_lc" == "jpeg" ]]; then
    if [[ "$needs_resize" -eq 0 ]]; then
      echo "Skipping (already <= ${MAX}px): $f (${w}x${h})"
      echo "skipped:1:$size_before:$size_before" > "$result_file"
      return 0
    fi

    action="Resize JPEG"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[DRY-RUN] Would resize: $f (${w}x${h} → max ${MAX}px)"
      echo "would_resize:1:$size_before:$size_before" > "$result_file"
      return 0
    fi

    echo "Resizing: $f (${w}x${h} → max ${MAX}px)"

    # JPEG: controlled lossy compression (high quality)
    if ! ffmpeg -loglevel error -nostdin -i "$f" \
      -vf "scale=${MAX}:${MAX}:force_original_aspect_ratio=decrease" \
      -q:v 2 \
      -y "$tmp" 2>/dev/null; then
      echo "Failed on: $f" >&2
      rm -f "$tmp"
      echo "failed:1:$size_before:$size_before" > "$result_file"
      return 0
    fi

    size_after="$(wc -c <"$tmp" | tr -d '[:space:]')"
    mv -f "$tmp" "$f"
    status="resized"

  else
    # PNG: resize if needed, always optimize with oxipng (if available)
    local was_resized=0

    if [[ "$needs_resize" -eq 1 ]]; then
      if [[ "$DRY_RUN" -eq 1 ]]; then
        action="Resize PNG"
        if [[ "$has_oxipng" -eq 1 ]]; then
          action="Resize + optimize PNG"
        fi
        echo "[DRY-RUN] Would ${action,,}: $f (${w}x${h} → max ${MAX}px)"
        echo "would_resize:1:$size_before:$size_before" > "$result_file"
        return 0
      fi

      echo "Resizing: $f (${w}x${h} → max ${MAX}px)"

      if ! ffmpeg -loglevel error -nostdin -i "$f" \
        -vf "scale=${MAX}:${MAX}:force_original_aspect_ratio=decrease" \
        -compression_level 9 -pred mixed \
        -y "$tmp" 2>/dev/null; then
        echo "Failed on: $f" >&2
        rm -f "$tmp"
        echo "failed:1:$size_before:$size_before" > "$result_file"
        return 0
      fi

      mv -f "$tmp" "$f"
      was_resized=1
      status="resized"
    fi

    # Always optimize PNGs with oxipng (even if not resized)
    if [[ "$has_oxipng" -eq 1 ]]; then
      if [[ "$DRY_RUN" -eq 1 ]]; then
        echo "[DRY-RUN] Would optimize PNG: $f (${w}x${h})"
        echo "would_optimize:1:$size_before:$size_before" > "$result_file"
        return 0
      fi

      if [[ "$was_resized" -eq 0 ]]; then
        echo "Optimizing PNG: $f (${w}x${h})"
      fi
      # -o 4 is a good default (solid savings, not painfully slow)
      # --strip safe removes safe-to-remove metadata chunks
      oxipng -o 4 --strip safe "$f" >/dev/null 2>&1 || true
      status="optimized"
    elif [[ "$needs_resize" -eq 0 ]]; then
      echo "Skipping (no resize needed, oxipng not installed): $f (${w}x${h})"
      echo "skipped:1:$size_before:$size_before" > "$result_file"
      return 0
    fi

    size_after="$(wc -c <"$f" | tr -d '[:space:]')"
  fi

  # Show per-file delta
  delta=$((size_before - size_after))
  if [[ "$delta" -ge 0 ]]; then
    printf "  Saved: %.2f MB (%d bytes)\n" "$(awk "BEGIN{print $delta/1048576}")" "$delta"
  else
    printf "  Grew:  %.2f MB (%d bytes)\n" "$(awk "BEGIN{print (-1*$delta)/1048576}")" "$delta"
  fi

  echo "${status}:1:$size_before:$size_after" > "$result_file"
}

export -f process_file

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "=== DRY-RUN MODE (no files will be modified) ==="
  echo ""
fi

# Find all images and process them
image_files=()
while IFS= read -r -d '' f; do
  image_files+=("$f")
done < <(find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -not -path "./.git/*" -print0)

if [[ ${#image_files[@]} -eq 0 ]]; then
  echo "No images found."
  exit 0
fi

echo "Found ${#image_files[@]} images. Processing with $PARALLEL_JOBS parallel jobs..."
echo ""

# Process files in parallel using xargs
printf '%s\0' "${image_files[@]}" | xargs -0 -P "$PARALLEL_JOBS" -I {} \
  bash -c 'process_file "$@"' _ {} "$MAX" "$DRY_RUN" "$has_oxipng" "$RESULTS_DIR"

# Aggregate results
count_resized=0
count_skipped=0
count_failed=0
count_optimized=0
count_would_resize=0
count_would_optimize=0
bytes_before_total=0
bytes_after_total=0

for result_file in "$RESULTS_DIR"/*; do
  [[ -f "$result_file" ]] || continue
  IFS=':' read -r status count before after < "$result_file"
  bytes_before_total=$((bytes_before_total + before))
  bytes_after_total=$((bytes_after_total + after))
  case "$status" in
    resized) count_resized=$((count_resized + count)) ;;
    skipped) count_skipped=$((count_skipped + count)) ;;
    failed) count_failed=$((count_failed + count)) ;;
    optimized) count_optimized=$((count_optimized + count)) ;;
    would_resize) count_would_resize=$((count_would_resize + count)) ;;
    would_optimize) count_would_optimize=$((count_would_optimize + count)) ;;
  esac
done

# Print totals
total_delta=$((bytes_before_total - bytes_after_total))

echo ""
echo "================ Summary ================"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "MODE:        DRY-RUN (no changes made)"
  echo "Would resize:    $count_would_resize"
  echo "Would optimize:  $count_would_optimize"
  echo "Skipped:         $count_skipped"
  echo "Failed:          $count_failed"
else
  echo "Resized:     $count_resized"
  echo "Optimized:   $count_optimized"
  echo "Skipped:     $count_skipped"
  echo "Failed:      $count_failed"
  if [[ "$has_oxipng" -eq 0 ]]; then
    echo "(oxipng not installed - PNG optimization skipped)"
  fi
  printf "Before:      %.2f MB\n" "$(awk "BEGIN{print $bytes_before_total/1048576}")"
  printf "After:       %.2f MB\n" "$(awk "BEGIN{print $bytes_after_total/1048576}")"
  if [[ "$total_delta" -ge 0 ]]; then
    printf "Saved:       %.2f MB\n" "$(awk "BEGIN{print $total_delta/1048576}")"
  else
    printf "Net grew:    %.2f MB\n" "$(awk "BEGIN{print (-1*$total_delta)/1048576}")"
  fi
fi
echo "========================================="
