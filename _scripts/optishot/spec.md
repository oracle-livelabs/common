# OptiShot - Project Specification

## Overview

OptiShot is a cross-platform image optimization tool designed to resize and compress images (JPEG/PNG) recursively within a directory. It was created as a user-friendly alternative to the bash-based `resize-image-compression.sh` script, with the primary goal of making the tool accessible to Windows users without requiring complex setup.

**Project Location:** `/common/_scripts/optishot/`

## Problem Statement

The original `resize-image-compression.sh` only worked on macOS/Linux and required users to have various command-line tools installed. Windows users had no easy way to use the image optimization workflow. OptiShot solves this by:

1. Providing a Python-based cross-platform solution
2. Offering GUI folder picker (no command line needed)
3. Building as standalone executables for both Windows and macOS
4. Including all dependencies (Python, Pillow, oxipng) in the executable

## Architecture

### File Structure

```
optishot/
├── optishot.py          # Main application (Python script)
├── build-macos.sh       # macOS build automation script
├── build-windows.ps1    # Windows build automation script (PowerShell)
├── generate-icon.py     # Icon generation script
├── OptiShot.icns        # macOS app icon (multi-resolution)
├── OptiShot.ico         # Windows app icon (multi-resolution)
├── OptiShot.iconset/    # Source iconset for macOS
├── README.md            # User documentation
├── spec.md              # This file - project specification
├── build/               # Build artifacts (generated)
└── dist/                # Distribution output (generated)
    └── OptiShot.app     # Built macOS application
```

### Core Components

#### 1. Image Processing Engine (`optishot.py`)

- **Library:** Pillow (PIL) for image manipulation
- **JPEG handling:** Resize with Lanczos filter, compress at 92% quality
- **PNG handling:** Resize with Lanczos filter, optimize with oxipng
- **Parallelism:** `ThreadPoolExecutor` for concurrent processing (default: 4 jobs)

#### 2. GUI System (tkinter)

- **Folder Picker:** `tkinter.filedialog.askdirectory()` for selecting target directory
- **Status Window:** Real-time progress display during processing
- **Thread Safety:** Queue-based message passing for GUI updates from worker threads

#### 3. Bundled Binary Support

- **oxipng:** PNG optimizer bundled with executables
- **Detection:** `sys._MEIPASS` (PyInstaller) for locating bundled files
- **Fallback:** System PATH lookup if not bundled

## Key Design Decisions

### 1. GUI Mode Detection

```python
def is_gui_mode():
    """Check if running as a GUI app (no console available)."""
    if getattr(sys, 'frozen', False):
        if sys.platform == "darwin":
            return True  # macOS .app bundles have no console
    return False
```

The app automatically detects whether it's running as a bundled GUI application and adjusts behavior accordingly (status window vs. console output).

### 2. Thread-Safe Logging

```python
_log_queue = queue.Queue()

def log_message(message):
    if _status_window is not None:
        _status_window.log(message)  # Adds to queue
    else:
        print(message)
```

All output goes through `log_message()` which routes to either the GUI status window (via thread-safe queue) or stdout.

### 3. PyInstaller Bundling

The build process uses `--onedir` mode (not `--onefile`) because:
- `--onefile` with `--windowed` is deprecated on macOS
- `--onedir` has faster startup time
- Easier to debug and verify bundled contents

## Build Process

### macOS (`build-macos.sh`)

1. Detect CPU architecture (Apple Silicon vs Intel)
2. Check Python and tkinter availability
3. Create virtual environment
4. Install dependencies (Pillow, PyInstaller)
5. Download architecture-appropriate oxipng binary
6. Build with PyInstaller:
   ```bash
   pyinstaller --onedir --name "OptiShot" \
       --add-binary "oxipng:." \
       --icon "OptiShot.icns" \
       --windowed --noconfirm optishot.py
   ```

### Windows (`build-windows.ps1`)

1. Check Python and tkinter availability
2. Create virtual environment
3. Install dependencies (Pillow, PyInstaller)
4. Download oxipng binary automatically
5. Build with PyInstaller:
   ```powershell
   pyinstaller --onedir --name "OptiShot" `
       --add-binary "oxipng.exe;." `
       --icon "OptiShot.ico" `
       --windowed --noconfirm optishot.py
   ```

Run: `.\build-windows.ps1` in PowerShell

## App Icon

The icon was generated programmatically (`generate-icon.py`) with:
- **Design:** Blue rounded rectangle background, white photo icon, green corner brackets
- **Symbolism:** Photo (image processing) + brackets (compression/optimization)
- **Formats:**
  - `.icns` for macOS (includes 16-1024px sizes)
  - `.ico` for Windows (includes 16-256px sizes)

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `directory` | (picker) | Target directory to process |
| `-n, --dry-run` | false | Preview changes without modifying |
| `-j, --jobs` | 4 | Number of parallel jobs |
| `-m, --max` | 1280 | Maximum dimension in pixels |

## Processing Behavior

### JPEG Files
- Skip if both dimensions <= max
- Resize proportionally if either dimension > max
- Save with quality=92, optimize=True

### PNG Files
- Resize proportionally if either dimension > max
- Always run oxipng optimization (if available)
- Uses oxipng flags: `-o 4 --strip safe`

### Exclusions
- `.git` directories are skipped
- Only processes `.jpg`, `.jpeg`, `.png` extensions

## Dependencies

| Dependency | Purpose | Bundled |
|------------|---------|---------|
| Python 3.6+ | Runtime | Yes (in executable) |
| Pillow | Image manipulation | Yes (in executable) |
| tkinter | GUI dialogs and status window | Yes (in executable) |
| oxipng | PNG optimization | Yes (in executable) |

## User Interaction Modes

1. **GUI Double-Click:** Opens folder picker, shows status window
2. **GUI Drag-and-Drop:** Drag folder onto app, shows status window
3. **CLI:** Full command-line control with all options

## Output Format

### Console Mode
```
Found 25 images. Processing with 4 parallel jobs...
Resizing: ./images/photo.jpg (2400x1600 → max 1280px)
  Saved: 0.45 MB (471859 bytes)
```

### GUI Status Window
- 700x500 dark-themed window
- Scrollable text area with monospace font
- Real-time updates via queue
- Close button enabled on completion

## Future Enhancement Ideas

- Batch quality settings for different image types
- Custom output directory option
- Before/after comparison view
- Undo functionality (backup originals)
- Support for additional formats (WebP, AVIF)
- Progress bar in status window

## Related Files

- Original bash script: `../resize-image-compression.sh`
- Original bash README: `../README-resize-image-compression.md`

## Version History

- **v1.0** - Initial release with GUI folder picker, status window, parallel processing, oxipng integration, and platform-specific build scripts
