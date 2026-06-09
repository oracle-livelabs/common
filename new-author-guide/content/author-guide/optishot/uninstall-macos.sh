#!/bin/bash
# OptiShot Uninstall Script for macOS
# Usage: /bin/bash -c "$(curl -fsSL <URL>/uninstall-macos.sh)"

set -e

APP_PATH="/Applications/OptiShot.app"

echo ""
echo "========================================"
echo "     OptiShot Uninstaller for macOS"
echo "========================================"
echo ""

if [ -d "$APP_PATH" ]; then
    echo "Removing OptiShot from $APP_PATH..."
    rm -rf "$APP_PATH"
    echo ""
    echo "OptiShot has been uninstalled successfully."
else
    echo "OptiShot is not installed at $APP_PATH"
    echo "Nothing to uninstall."
fi

echo ""
