#!/bin/bash
#
# Build script for creating a standalone macOS app bundle
# Includes: Python, Pillow, tkinter, and oxipng
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
DIST_DIR="$SCRIPT_DIR/dist"
VENV_DIR="$BUILD_DIR/venv"
OXIPNG_VERSION="9.1.3"
APP_NAME="LiveLabs Fixomat 2000"
ICON_PATH="$SCRIPT_DIR/fixomat.icns"

printf "========================================\n"
printf "  %s - macOS Build\n" "$APP_NAME"
printf "========================================\n\n"

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo "Detected: Apple Silicon (arm64)"
    OXIPNG_ARCH="aarch64-apple-darwin"
else
    echo "Detected: Intel (x86_64)"
    OXIPNG_ARCH="x86_64-apple-darwin"
fi
echo ""

# Check for Python with tkinter
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found."
    echo "Install Python from https://python.org (includes tkinter)"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "Found: $PYTHON_VERSION"

# Check for tkinter
echo "Checking tkinter..."
if ! python3 -c "import tkinter" 2>/dev/null; then
    echo ""
    echo "Error: tkinter not found."
    echo ""
    echo "To fix this:"
    echo "  1. Install Python from https://python.org (recommended)"
    echo "     OR"
    echo "  2. Install via Homebrew: brew install python-tk"
    echo ""
    exit 1
fi
echo "tkinter: OK"
echo ""

# Create build directory
echo "Creating build directory..."
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv "$VENV_DIR"
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip -q
pip install pillow pyinstaller -q
echo "Dependencies installed."
echo ""

# Download oxipng
OXIPNG_URL="https://github.com/shssoichiro/oxipng/releases/download/v${OXIPNG_VERSION}/oxipng-${OXIPNG_VERSION}-${OXIPNG_ARCH}.tar.gz"
OXIPNG_TAR="oxipng-${OXIPNG_VERSION}.tar.gz"
OXIPNG_BIN="$BUILD_DIR/oxipng"

if [ -f "$OXIPNG_BIN" ]; then
    echo "oxipng already downloaded."
else
    echo "Downloading oxipng v${OXIPNG_VERSION}..."
    curl -L -o "$OXIPNG_TAR" "$OXIPNG_URL"

    echo "Extracting oxipng..."
    tar -xzf "$OXIPNG_TAR"
    mv "oxipng-${OXIPNG_VERSION}-${OXIPNG_ARCH}/oxipng" "$OXIPNG_BIN"
    chmod +x "$OXIPNG_BIN"

    # Cleanup
    rm -rf "oxipng-${OXIPNG_VERSION}-${OXIPNG_ARCH}"
    rm "$OXIPNG_TAR"
fi

echo "oxipng: OK"
echo ""

# Build with PyInstaller
echo "Building application with PyInstaller..."
cd "$SCRIPT_DIR"

PYINSTALLER_ARGS=(
    --onedir
    --name "$APP_NAME"
    --add-binary "$OXIPNG_BIN:."
    --hidden-import concurrent
    --hidden-import concurrent.futures
    --collect-submodules PIL
    --windowed
    --noconfirm
)

if [ -f "$ICON_PATH" ]; then
    PYINSTALLER_ARGS+=(--icon "$ICON_PATH")
fi

pyinstaller "${PYINSTALLER_ARGS[@]}" "$SCRIPT_DIR/fixomat.py"

echo ""

# Verify oxipng was bundled (check both old and new PyInstaller structures)
APP_CONTENTS="$DIST_DIR/$APP_NAME.app/Contents"
BUNDLED_OXIPNG=""

if [ -f "$APP_CONTENTS/MacOS/oxipng" ]; then
    BUNDLED_OXIPNG="$APP_CONTENTS/MacOS/oxipng"
elif [ -f "$APP_CONTENTS/MacOS/_internal/oxipng" ]; then
    BUNDLED_OXIPNG="$APP_CONTENTS/MacOS/_internal/oxipng"
elif [ -f "$APP_CONTENTS/Frameworks/oxipng" ]; then
    BUNDLED_OXIPNG="$APP_CONTENTS/Frameworks/oxipng"
fi

if [ -n "$BUNDLED_OXIPNG" ]; then
    echo "========================================"
    echo "  Build Complete!"
    echo "========================================"
    echo ""
    echo "Output: $DIST_DIR/$APP_NAME.app"
    echo ""
    echo "Bundled components verified:"
    echo "  - $APP_NAME.app: OK"
    echo "  - oxipng: OK (found at: $BUNDLED_OXIPNG)"
    echo ""
else
    echo "========================================"
    echo "  Build Warning!"
    echo "========================================"
    echo ""
    echo "WARNING: oxipng was NOT bundled in the final build!"
    echo "The application was built but PNG optimization will not work."
    echo ""
    echo "Contents of app bundle:"
    ls -la "$APP_CONTENTS/MacOS/" 2>/dev/null || echo "  (MacOS folder not found)"
    if [ -d "$APP_CONTENTS/MacOS/_internal" ]; then
        echo ""
        echo "Contents of _internal (first 20):"
        ls "$APP_CONTENTS/MacOS/_internal/" 2>/dev/null | head -20
    fi
    echo ""
    echo "To fix, delete build and dist folders and try again:"
    echo "  rm -rf '$BUILD_DIR' '$DIST_DIR'"
    echo ""
    exit 1
fi

# Cleanup virtual environment (optional)
# rm -rf "$VENV_DIR"

deactivate 2>/dev/null || true
