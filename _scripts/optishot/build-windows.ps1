#
# Build script for creating a standalone Windows executable
# Includes: Python, Pillow, tkinter, and oxipng
#
# Prerequisites:
#   1. Python 3 with tkinter (from https://python.org)
#   2. oxipng.exe in this directory (download from https://github.com/shssoichiro/oxipng/releases)
#
# Run in PowerShell: .\build-windows.ps1
#

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ScriptDir "build"
$DistDir = Join-Path $ScriptDir "dist"
$VenvDir = Join-Path $BuildDir "venv"

Write-Host "========================================"
Write-Host "  OptiShot - Windows Build"
Write-Host "========================================"
Write-Host ""

# Check for Python
Write-Host "Checking Python installation..."
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Python not found"
    }
    Write-Host "Found: $pythonVersion"
} catch {
    Write-Host ""
    Write-Host "Error: Python 3 not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python from https://python.org"
    Write-Host "  - Make sure to check 'Add Python to PATH' during installation"
    Write-Host ""
    exit 1
}

# Check Python version is 3.x
$versionMatch = python -c "import sys; print(sys.version_info.major)"
if ($versionMatch -ne "3") {
    Write-Host "Error: Python 3 is required, but Python 2 was found." -ForegroundColor Red
    exit 1
}

# Check for tkinter
Write-Host "Checking tkinter..."
try {
    python -c "import tkinter" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "tkinter not found"
    }
    Write-Host "tkinter: OK"
} catch {
    Write-Host ""
    Write-Host "Error: tkinter not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "tkinter is included with Python from python.org"
    Write-Host "If you installed Python from the Microsoft Store, please:"
    Write-Host "  1. Uninstall Python from Microsoft Store"
    Write-Host "  2. Install Python from https://python.org"
    Write-Host ""
    exit 1
}
Write-Host ""

# Create build directory
Write-Host "Creating build directory..."
if (-not (Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}
Set-Location $BuildDir

# Create virtual environment
Write-Host "Creating virtual environment..."
if (-not (Test-Path $VenvDir)) {
    python -m venv $VenvDir
}

# Activate virtual environment
$activateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
. $activateScript

# Install dependencies
Write-Host "Installing Python dependencies..."
pip install --upgrade pip -q
pip install pillow pyinstaller -q
Write-Host "Dependencies installed."
Write-Host ""

# Check for oxipng.exe in script directory
$OxipngBin = Join-Path $ScriptDir "oxipng.exe"

Write-Host "Checking for oxipng.exe..."
if (Test-Path $OxipngBin) {
    Write-Host "oxipng: OK ($($(& $OxipngBin --version 2>&1) -split '\n' | Select-Object -First 1))"
} else {
    Write-Host ""
    Write-Host "ERROR: oxipng.exe not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download oxipng and place oxipng.exe in:" -ForegroundColor Yellow
    Write-Host "  $ScriptDir"
    Write-Host ""
    Write-Host "Download from: https://github.com/shssoichiro/oxipng/releases"
    Write-Host "  (Get the Windows x86_64 MSVC zip file)"
    Write-Host ""
    exit 1
}
Write-Host ""

# Build with PyInstaller
Write-Host "Building application with PyInstaller..."
Set-Location $ScriptDir

$iconPath = Join-Path $ScriptDir "OptiShot.ico"
$scriptPath = Join-Path $ScriptDir "optishot.py"

Write-Host "Bundling oxipng: $OxipngBin"

if (Test-Path $iconPath) {
    Write-Host "Using custom icon: OptiShot.ico"
    pyinstaller --onedir --name "OptiShot" --windowed --noconfirm --icon "$iconPath" --add-binary "$OxipngBin;." "$scriptPath"
} else {
    pyinstaller --onedir --name "OptiShot" --windowed --noconfirm --add-binary "$OxipngBin;." "$scriptPath"
}

Write-Host ""

# Debug: Show what files are in the dist folder
Write-Host "Contents of dist\OptiShot:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $DistDir "OptiShot") -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $($_.Name)" }
$internalDir = Join-Path $DistDir "OptiShot\_internal"
if (Test-Path $internalDir) {
    Write-Host "Contents of dist\OptiShot\_internal (first 20):" -ForegroundColor Cyan
    Get-ChildItem -Path $internalDir -ErrorAction SilentlyContinue | Select-Object -First 20 | ForEach-Object { Write-Host "  $($_.Name)" }
}
Write-Host ""

# Verify oxipng was bundled (check both old and new PyInstaller structures)
$bundledOxipng = Join-Path $DistDir "OptiShot\oxipng.exe"
$bundledOxipngInternal = Join-Path $DistDir "OptiShot\_internal\oxipng.exe"

if (Test-Path $bundledOxipngInternal) {
    $bundledOxipng = $bundledOxipngInternal
}

if (Test-Path $bundledOxipng) {
    Write-Host "========================================"
    Write-Host "  Build Complete!"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Output: $DistDir\OptiShot\OptiShot.exe"
    Write-Host ""
    Write-Host "Bundled components verified:" -ForegroundColor Green
    Write-Host "  - OptiShot.exe: OK"
    Write-Host "  - oxipng.exe: OK"
    Write-Host ""
    Write-Host "To use:"
    Write-Host "  1. Double-click OptiShot.exe to open folder picker"
    Write-Host "  2. Or drag a folder onto the executable"
    Write-Host ""
    Write-Host "To distribute:"
    Write-Host "  Compress-Archive -Path `"$DistDir\OptiShot`" -DestinationPath `"OptiShot-Windows.zip`""
    Write-Host ""
} else {
    Write-Host "========================================"
    Write-Host "  Build Warning!"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "WARNING: oxipng.exe was NOT bundled in the final build!" -ForegroundColor Red
    Write-Host "The application was built but PNG optimization will not work." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected location: $bundledOxipng"
    Write-Host ""
    Write-Host "To fix, delete build and dist folders and try again:"
    Write-Host "  Remove-Item -Recurse -Force '$BuildDir', '$DistDir'"
    Write-Host ""
    exit 1
}

# Deactivate virtual environment
deactivate
