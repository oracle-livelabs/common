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

echo "========================================"
echo "  OptiShot - macOS Build"
echo "========================================"
echo ""

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

pyinstaller \
    --onedir \
    --name "OptiShot" \
    --add-binary "$OXIPNG_BIN:." \
    --icon "$SCRIPT_DIR/OptiShot.icns" \
    --windowed \
    --noconfirm \
    "$SCRIPT_DIR/optishot.py"

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "Output: $DIST_DIR/OptiShot.app"
echo ""
echo "To use:"
echo "  1. Double-click the app to open folder picker"
echo "  2. Or drag a folder onto the app icon"
echo ""

# Cleanup virtual environment (optional)
# rm -rf "$VENV_DIR"

deactivate 2>/dev/null || true
