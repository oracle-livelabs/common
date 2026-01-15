# OptiShot (optishot.py)

A cross-platform image optimization tool that resizes and compresses images (JPG/PNG) recursively. Works on **Windows**, macOS, and Linux.

## Features

- **GUI folder picker** - Double-click to open a folder selection dialog (no command line needed)
- **Cross-platform** - Works on Windows, macOS, and Linux
- **Recursive scanning** - Finds all images in subdirectories
- **Smart resizing** - Only resizes images larger than the max dimension (default: 1280px)
- **Proportional scaling** - Maintains aspect ratio when resizing
- **PNG optimization** - Uses oxipng to optimize all PNGs (if installed)
- **JPEG compression** - High-quality compression (92% quality)
- **Parallel processing** - Process multiple images concurrently for faster execution
- **Dry-run mode** - Preview changes without modifying files

## Requirements

- **Python 3.6+**
- **Pillow** - Python imaging library
- **oxipng** (optional) - For enhanced PNG optimization

### Installation

**Windows:**
```powershell
# Install Python from https://python.org if needed
pip install pillow
```

**macOS:**
```bash
pip3 install pillow
# Optional: brew install oxipng
```

**Linux:**
```bash
pip3 install pillow
# Optional: sudo apt install oxipng
```

## Usage

### GUI Mode (Easiest)

Simply run the script without arguments to open a folder picker dialog:

```bash
python optishot.py
```

A dialog window will appear where you can select the folder containing your images.

### Command Line Mode

```bash
python optishot.py [DIRECTORY] [OPTIONS]
```

Or on macOS/Linux:
```bash
python3 optishot.py [DIRECTORY] [OPTIONS]
```

### Options

| Option | Description |
|--------|-------------|
| `DIRECTORY` | Directory to process (opens folder picker if not specified) |
| `-n, --dry-run` | Preview changes without modifying files |
| `-j, --jobs N` | Number of parallel jobs (default: 4) |
| `-m, --max N` | Maximum dimension in pixels (default: 1280) |
| `-h, --help` | Show help message |

### Examples

```bash
# Open folder picker dialog
python optishot.py

# Process a specific directory
python optishot.py /path/to/images

# Preview what would be changed (no modifications)
python optishot.py -n

# Use 8 parallel jobs for faster processing
python optishot.py -j 8

# Resize to max 1920px instead of 1280px
python optishot.py -m 1920

# Combine options: specific directory with dry-run
python optishot.py /path/to/images -n -m 1920
```

## Behavior

### JPEG files (.jpg, .jpeg)
- Skipped if already within max dimensions
- Resized proportionally if larger than max
- Compressed with high quality (92%)

### PNG files (.png)
- Resized proportionally if larger than max dimensions
- Optimized with oxipng (if installed), even if not resized
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

## Troubleshooting

### "Pillow library not found"
```bash
pip install pillow
# or
pip3 install pillow
```

### "python not found" (Windows)
- Download and install Python from https://python.org
- Make sure to check "Add Python to PATH" during installation

### Script runs but no images processed
- Ensure you're running the script from a directory containing images
- Check that images have `.jpg`, `.jpeg`, or `.png` extensions
- Use `-n` (dry-run) to see what would be processed

## Optional: Enhanced PNG Compression

For better PNG compression, install oxipng:

**Windows:**
```powershell
scoop install oxipng
# Or download from https://github.com/shssoichiro/oxipng/releases
```

**macOS:**
```bash
brew install oxipng
```

**Linux:**
```bash
sudo apt install oxipng
# Or: cargo install oxipng
```

## Building a Standalone Windows Executable

You can create a standalone `.exe` that runs without requiring Python or any libraries. This must be done on a Windows machine.

### Prerequisites

**Python 3.8+** from [python.org](https://python.org)
- Check "Add Python to PATH" during installation
- The python.org installer includes tkinter (required for GUI)

### Automated Build (Recommended)

A build script is provided that handles everything automatically:

1. Open PowerShell
2. Navigate to the optishot directory:
   ```powershell
   cd path\to\optishot
   ```
3. Run the build script:
   ```powershell
   .\build-windows.ps1
   ```
4. The executable will be created at:
   ```
   dist\OptiShot\OptiShot.exe
   ```

The build script will:
- Check Python and tkinter installation
- Create a virtual environment
- Install Pillow and PyInstaller
- Download oxipng automatically
- Build the executable with the custom icon

### Manual Build (Alternative)

If you prefer to build manually:

1. **Install build dependencies:**
   ```powershell
   pip install pillow pyinstaller
   ```

2. **Download oxipng** (optional, for PNG optimization):
   - Download from https://github.com/shssoichiro/oxipng/releases
   - Get the `oxipng-X.X.X-x86_64-pc-windows-msvc.zip` file
   - Extract `oxipng.exe` to the same folder as `optishot.py`

3. **Run PyInstaller:**

   **Basic build (without oxipng):**
   ```powershell
   pyinstaller --onedir --name OptiShot --icon OptiShot.ico --windowed --noconfirm optishot.py
   ```

   **Full build with oxipng (recommended):**
   ```powershell
   pyinstaller --onedir --name OptiShot --icon OptiShot.ico --add-binary "oxipng.exe;." --windowed --noconfirm optishot.py
   ```

### Build Options

| Option | Description |
|--------|-------------|
| `--onedir` | Create app as a folder (recommended for Windows) |
| `--onefile` | Bundle into single .exe (slower startup) |
| `--name NAME` | Name of the output executable |
| `--add-binary "src;dest"` | Include oxipng binary |
| `--windowed` | Use GUI window instead of console |
| `--icon FILE.ico` | Add a custom icon (optional) |

### Using the Executable

#### Option 1: Double-Click (Easiest)

1. Double-click `OptiShot.exe`
2. A folder picker dialog will appear
3. Select the folder containing your images
4. A status window shows real-time progress
5. Click "Close" when done

#### Option 2: Drag and Drop

1. Drag your images folder onto `OptiShot.exe`
2. The status window shows processing progress
3. Click "Close" when done

#### Option 3: Command Line

```powershell
# Open folder picker dialog
OptiShot.exe

# Process a specific folder directly
OptiShot.exe C:\path\to\your\images

# With options
OptiShot.exe C:\path\to\images -n           # dry-run
OptiShot.exe C:\path\to\images -m 1920      # max 1920px
OptiShot.exe C:\path\to\images -j 8         # 8 parallel jobs
```

### Distributing the Executable

The generated `OptiShot` folder:
- Is completely standalone (~25-40 MB)
- Includes Python, Pillow, tkinter, and optionally oxipng
- Requires no installation on the target machine
- Works on Windows 10/11 (64-bit)
- Can be zipped and shared via file transfer or included in a release

To distribute:
```powershell
# Create a zip file for sharing
Compress-Archive -Path "dist\OptiShot" -DestinationPath "OptiShot-Windows.zip"
```

### Troubleshooting Build Issues

**"running scripts is disabled on this system"**
```powershell
# Run this once to allow local scripts:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**"pyinstaller not found"**
```powershell
pip install pyinstaller
```

**"No module named tkinter"**
- Reinstall Python from python.org (not Microsoft Store)
- Make sure to use the official installer which includes tkinter

**Antivirus blocks the executable**
- Some antivirus software flags PyInstaller executables as suspicious
- This is a false positive due to how PyInstaller packages Python
- Add an exception in your antivirus software

**oxipng not working**
- Ensure `oxipng.exe` was in the same directory as `optishot.py` when building
- Verify with: `dir dist\OptiShot\oxipng.exe`

## Building a Standalone macOS App

A build script is provided that creates a self-contained `.app` bundle including Python, Pillow, tkinter, and oxipng.

### Prerequisites

- **Python 3 with tkinter** - Install from [python.org](https://python.org) (recommended) or via Homebrew (`brew install python-tk`)

### Build Steps

1. Open Terminal
2. Navigate to the scripts directory:
   ```bash
   cd /path/to/common/_scripts
   ```
3. Run the build script:
   ```bash
   ./build-macos.sh
   ```
4. The app will be created at:
   ```
   dist/OptiShot.app
   ```

### What the Build Script Does

1. Checks for Python with tkinter support
2. Creates a virtual environment
3. Installs Pillow and PyInstaller
4. Downloads the correct oxipng binary (Intel or Apple Silicon)
5. Builds a self-contained `.app` bundle

### Using the macOS App

#### Option 1: Double-Click (Easiest)

1. Double-click `OptiShot.app`
2. A folder picker dialog will appear
3. Select the folder containing your images
4. The tool will process all images and show results

#### Option 2: Drag and Drop

1. Drag your images folder onto the app icon
2. The tool will process all images in that folder

#### Option 3: Command Line

```bash
# Open the app (shows folder picker)
open "OptiShot.app"

# Process a specific folder
open "OptiShot.app" --args /path/to/images
```

### Distributing the macOS App

The generated `.app` bundle:
- Is completely standalone (~25-30 MB)
- Includes Python, Pillow, tkinter, and oxipng
- Works on macOS 10.13+ (High Sierra and later)
- Supports both Intel and Apple Silicon (build on target architecture)
- Can be shared via file transfer, zip archive, or DMG

### Troubleshooting macOS Build Issues

**"tkinter not found"**
- Install Python from python.org (includes tkinter)
- Or run: `brew install python-tk`

**"curl: (22) The requested URL returned error: 404"**
- The oxipng version in the script may be outdated
- Check https://github.com/shssoichiro/oxipng/releases for latest version
- Update `OXIPNG_VERSION` in `build-macos.sh`

**App won't open ("damaged" or "unidentified developer")**
- Right-click the app and select "Open"
- Or run: `xattr -cr "OptiShot.app"`

## Notes

- The script excludes `.git` directories from scanning
- Original files are overwritten (no backup created)
- If oxipng is not installed, PNGs that don't need resizing will be skipped
- Uses Python's ThreadPoolExecutor for parallel processing
