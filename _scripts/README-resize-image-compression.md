# resize-image-compression.sh

A bash script to recursively resize and optimize images (JPG/PNG) in a directory.

## Features

- **Recursive scanning** - Finds all images in subdirectories
- **Smart resizing** - Only resizes images larger than the max dimension (default: 1280px)
- **Proportional scaling** - Maintains aspect ratio when resizing
- **PNG optimization** - Uses oxipng to optimize all PNGs (even those that don't need resizing)
- **JPEG compression** - High-quality lossy compression (q:v 2)
- **Parallel processing** - Process multiple images concurrently for faster execution
- **Dry-run mode** - Preview changes without modifying files
- **Cross-platform** - Works on macOS and Linux

## Requirements

- **ffmpeg** - For resizing images and reading dimensions
- **ffprobe** - Part of ffmpeg, used to get image dimensions
- **oxipng** (optional) - For PNG optimization

### Installation

macOS:
```bash
brew install ffmpeg oxipng
```

Ubuntu/Debian:
```bash
apt install ffmpeg
cargo install oxipng  # or download from https://github.com/shssoichern/oxipng
```

## Usage

```bash
./resize-image-compression.sh [OPTIONS]
```

### Options

| Option | Description |
|--------|-------------|
| `-n, --dry-run` | Preview changes without modifying files |
| `-j, --jobs N` | Number of parallel jobs (default: 4) |
| `-m, --max N` | Maximum dimension in pixels (default: 1280) |
| `-h, --help` | Show help message |

### Examples

```bash
# Process all images in current directory (and subdirectories)
./resize-image-compression.sh

# Preview what would be changed (no modifications)
./resize-image-compression.sh -n

# Use 8 parallel jobs for faster processing
./resize-image-compression.sh -j 8

# Resize to max 1920px instead of 1280px
./resize-image-compression.sh -m 1920

# Combine options: dry-run with custom max size
./resize-image-compression.sh -n -m 1920
```

## Behavior

### JPEG files (.jpg, .jpeg)
- Skipped if already within max dimensions
- Resized proportionally if larger than max
- Compressed with high quality (ffmpeg -q:v 2)

### PNG files (.png)
- Resized proportionally if larger than max dimensions
- Always optimized with oxipng (if installed), even if not resized
- Uses lossless compression

## Output

The script provides per-file feedback and a summary:

```
Found 25 images. Processing with 4 parallel jobs...

Resizing: ./images/large-photo.jpg (2400x1600 → max 1280px)
  Saved: 0.45 MB (471859 bytes)
Optimizing PNG: ./icons/logo.png (256x256)
  Saved: 0.02 MB (18432 bytes)
Skipping (already <= 1280px): ./thumbs/small.jpg (640x480)

================ Summary ================
Resized:     12
Optimized:   8
Skipped:     5
Failed:      0
Before:      15.32 MB
After:       8.76 MB
Saved:       6.56 MB
=========================================
```

### Dry-run output

```
=== DRY-RUN MODE (no files will be modified) ===

[DRY-RUN] Would resize: ./images/large-photo.jpg (2400x1600 → max 1280px)
[DRY-RUN] Would optimize PNG: ./icons/logo.png (256x256)

================ Summary ================
MODE:        DRY-RUN (no changes made)
Would resize:    12
Would optimize:  8
Skipped:         5
Failed:          0
=========================================
```

## Notes

- The script excludes `.git` directories from scanning
- Original files are overwritten (no backup created)
- Temporary files use PID in filename to avoid conflicts during parallel processing
- If oxipng is not installed, PNGs that don't need resizing will be skipped
