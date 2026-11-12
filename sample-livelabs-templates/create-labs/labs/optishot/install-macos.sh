#!/bin/bash
# OptiShot Installation Script for macOS (Arm)
# Usage: /bin/bash -c "$(curl -fsSL <URL>/install-macos.sh)"

set -e

DOWNLOAD_URL="https://objectstorage.us-ashburn-1.oraclecloud.com/p/4Au3jJ-t8Wtw3LWyYsDMqQk2FdlXDvXCb1MYRS0J6P4QS-GCrv2YNOolWdtFMLZq/n/c4u04/b/livelabsfiles/o/optishot/OptiShot-MacOS-arm.zip"
INSTALL_DIR="/Applications"
TEMP_DIR=$(mktemp -d)

echo "Installing OptiShot..."
echo ""

# Download
echo "Downloading OptiShot..."
curl -fsSL -o "$TEMP_DIR/OptiShot.zip" "$DOWNLOAD_URL"

# Extract
echo "Extracting..."
unzip -q -o "$TEMP_DIR/OptiShot.zip" -d "$TEMP_DIR"

# Install to /Applications
echo "Installing to $INSTALL_DIR..."
if [ -d "$INSTALL_DIR/OptiShot.app" ]; then
    rm -rf "$INSTALL_DIR/OptiShot.app"
fi
cp -R "$TEMP_DIR/OptiShot.app" "$INSTALL_DIR/"

# Cleanup
rm -rf "$TEMP_DIR"

# Remove quarantine attribute to avoid security warnings
xattr -dr com.apple.quarantine "$INSTALL_DIR/OptiShot.app" 2>/dev/null || true

echo ""
echo "OptiShot installed successfully to $INSTALL_DIR/OptiShot.app"
echo ""
echo "To launch: Open Finder, go to Applications, and double-click OptiShot"
echo ""
echo "Note: On first launch, you may need to allow the app in"
echo "System Settings > Privacy & Security if a security warning appears."
