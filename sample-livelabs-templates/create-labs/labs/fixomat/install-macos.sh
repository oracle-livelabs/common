#!/bin/bash
# Fixomat Installation Script for macOS (Arm)
# Usage: /bin/bash -c "$(curl -fsSL <URL>/install-macos.sh)"

set -e

APP_NAME="LiveLabs Fixomat 2000"
APP_BUNDLE="${APP_NAME}.app"
INSTALL_DIR="/Applications"

# Replace this with the real package URL when available.
DEFAULT_DOWNLOAD_URL="https://example.com/fixomat/LiveLabs-Fixomat-2000-MacOS-arm.zip"
DOWNLOAD_URL="${FIXOMAT_DOWNLOAD_URL:-$DEFAULT_DOWNLOAD_URL}"

if [ "$DOWNLOAD_URL" = "$DEFAULT_DOWNLOAD_URL" ]; then
    echo ""
    echo "ERROR: Download URL is still a placeholder."
    echo "Please set FIXOMAT_DOWNLOAD_URL to the real URL, for example:"
    echo "  FIXOMAT_DOWNLOAD_URL='https://your-download-url.zip' /bin/bash -c \"\$(curl -fsSL <script-url>)\""
    echo ""
    exit 1
fi

TEMP_DIR=$(mktemp -d)
ZIP_PATH="$TEMP_DIR/fixomat.zip"

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "Installing $APP_NAME..."
echo ""

# Download
printf "Downloading package...\n"
curl -fsSL -o "$ZIP_PATH" "$DOWNLOAD_URL"

# Extract
printf "Extracting package...\n"
unzip -q -o "$ZIP_PATH" -d "$TEMP_DIR"

# Locate app bundle in extracted payload
APP_SOURCE=$(find "$TEMP_DIR" -maxdepth 4 -type d -name "$APP_BUNDLE" | head -n 1)
if [ -z "$APP_SOURCE" ]; then
    echo ""
    echo "ERROR: Could not find $APP_BUNDLE in downloaded archive."
    echo "Verify that the package URL points to a valid Fixomat macOS bundle zip."
    echo ""
    exit 1
fi

# Install to /Applications
printf "Installing to %s...\n" "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/$APP_BUNDLE"
cp -R "$APP_SOURCE" "$INSTALL_DIR/"

# Remove quarantine to reduce first-launch friction
xattr -dr com.apple.quarantine "$INSTALL_DIR/$APP_BUNDLE" 2>/dev/null || true

echo ""
echo "$APP_NAME installed successfully to $INSTALL_DIR/$APP_BUNDLE"
echo ""
echo "To launch: open Applications and start $APP_NAME"
echo ""
