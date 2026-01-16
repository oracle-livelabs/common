#
# Build script for creating a standalone Windows executable
# Includes: Python, Pillow, tkinter, and oxipng
#
# Run in PowerShell: .\build-windows.ps1
#

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ScriptDir "build"
$DistDir = Join-Path $ScriptDir "dist"
$VenvDir = Join-Path $BuildDir "venv"
$OxipngVersion = "9.1.3"

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

# Download oxipng
$OxipngUrl = "https://github.com/shssoichiro/oxipng/releases/download/v$OxipngVersion/oxipng-$OxipngVersion-x86_64-pc-windows-msvc.zip"
$OxipngZip = Join-Path $BuildDir "oxipng-$OxipngVersion.zip"
$OxipngBin = Join-Path $BuildDir "oxipng.exe"

if (Test-Path $OxipngBin) {
    Write-Host "oxipng already downloaded."
} else {
    Write-Host "Downloading oxipng v$OxipngVersion..."

    try {
        Invoke-WebRequest -Uri $OxipngUrl -OutFile $OxipngZip -UseBasicParsing
    } catch {
        Write-Host "Warning: Failed to download oxipng. PNG optimization will not be available." -ForegroundColor Yellow
        Write-Host "You can manually download from: https://github.com/shssoichiro/oxipng/releases"
        Write-Host ""
        $OxipngBin = $null
    }

    if ($OxipngBin -and (Test-Path $OxipngZip)) {
        Write-Host "Extracting oxipng..."
        Expand-Archive -Path $OxipngZip -DestinationPath $BuildDir -Force

        # Move oxipng.exe to build directory root
        $extractedExe = Join-Path $BuildDir "oxipng-$OxipngVersion-x86_64-pc-windows-msvc\oxipng.exe"
        if (Test-Path $extractedExe) {
            Move-Item -Path $extractedExe -Destination $OxipngBin -Force
        }

        # Cleanup
        $extractedDir = Join-Path $BuildDir "oxipng-$OxipngVersion-x86_64-pc-windows-msvc"
        if (Test-Path $extractedDir) {
            Remove-Item -Path $extractedDir -Recurse -Force
        }
        Remove-Item -Path $OxipngZip -Force
    }
}

if ($OxipngBin -and (Test-Path $OxipngBin)) {
    Write-Host "oxipng: OK"
} else {
    Write-Host "oxipng: Not available (PNG optimization disabled)" -ForegroundColor Yellow
}
Write-Host ""

# Build with PyInstaller
Write-Host "Building application with PyInstaller..."
Set-Location $ScriptDir

$pyinstallerArgs = @(
    "--onedir",
    "--name", "OptiShot",
    "--windowed",
    "--noconfirm"
)

# Add icon if it exists
$iconPath = Join-Path $ScriptDir "OptiShot.ico"
if (Test-Path $iconPath) {
    $pyinstallerArgs += "--icon"
    $pyinstallerArgs += $iconPath
    Write-Host "Using custom icon: OptiShot.ico"
}

# Add oxipng if available
if ($OxipngBin -and (Test-Path $OxipngBin)) {
    $pyinstallerArgs += "--add-binary"
    $pyinstallerArgs += "$OxipngBin;."
    Write-Host "Bundling oxipng for PNG optimization"
}

$pyinstallerArgs += (Join-Path $ScriptDir "optishot.py")

# Run PyInstaller
pyinstaller @pyinstallerArgs

Write-Host ""
Write-Host "========================================"
Write-Host "  Build Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Output: $DistDir\OptiShot\OptiShot.exe"
Write-Host ""
Write-Host "To use:"
Write-Host "  1. Double-click OptiShot.exe to open folder picker"
Write-Host "  2. Or drag a folder onto the executable"
Write-Host ""
Write-Host "To distribute:"
Write-Host "  Compress-Archive -Path `"$DistDir\OptiShot`" -DestinationPath `"OptiShot-Windows.zip`""
Write-Host ""

# Deactivate virtual environment
deactivate
