#
# Build script for creating a standalone Windows executable
# Includes: Python, Pillow, tkinter, and oxipng
#
# Prerequisites:
#   1. Python 3 with tkinter (from https://python.org)
#
# Run in PowerShell: .\build-windows.ps1
#

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ScriptDir "build"
$DistDir = Join-Path $ScriptDir "dist"
$VenvDir = Join-Path $BuildDir "venv"

$AppName = "LiveLabs Fixomat 2000"
$OxipngVersion = "9.1.3"
$OxipngArch = "x86_64-pc-windows-msvc"
$IconPath = Join-Path $ScriptDir "fixomat.ico"

Write-Host "========================================"
Write-Host "  $AppName - Windows Build"
Write-Host "========================================"
Write-Host ""

# Check for Python
Write-Host "Checking Python installation..."
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Python not found" }
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
    if ($LASTEXITCODE -ne 0) { throw "tkinter not found" }
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
python -m pip install --upgrade pip -q
python -m pip install pillow pyinstaller -q
Write-Host "Dependencies installed."
Write-Host ""

# Ensure oxipng.exe in script directory (auto-download if missing)
$OxipngBin = Join-Path $ScriptDir "oxipng.exe"
$OxipngZip = Join-Path $BuildDir ("oxipng-{0}-{1}.zip" -f $OxipngVersion, $OxipngArch)
$OxipngUrl = "https://github.com/shssoichiro/oxipng/releases/download/v{0}/oxipng-{0}-{1}.zip" -f $OxipngVersion, $OxipngArch
$OxipngExtractDir = Join-Path $BuildDir ("oxipng-{0}-{1}" -f $OxipngVersion, $OxipngArch)

Write-Host "Checking for oxipng.exe..."
if (-not (Test-Path $OxipngBin)) {
    Write-Host "oxipng.exe not found. Downloading..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $OxipngUrl -OutFile $OxipngZip
    Expand-Archive -Path $OxipngZip -DestinationPath $BuildDir -Force
    $DownloadedOxipng = Join-Path $OxipngExtractDir "oxipng.exe"
    if (Test-Path $DownloadedOxipng) {
        Copy-Item -Path $DownloadedOxipng -Destination $OxipngBin -Force
        Write-Host "oxipng.exe downloaded to: $OxipngBin"
    } else {
        Write-Host "ERROR: oxipng.exe was not found in the downloaded archive." -ForegroundColor Red
        exit 1
    }
}

if (Test-Path $OxipngBin) {
    Write-Host "oxipng: OK ($($(& $OxipngBin --version 2>&1) -split '\n' | Select-Object -First 1))"
} else {
    Write-Host ""
    Write-Host "ERROR: oxipng.exe not found!" -ForegroundColor Red
    Write-Host ""
    exit 1
}
Write-Host ""

# Build with PyInstaller
Write-Host "Building application with PyInstaller..."
Set-Location $ScriptDir

$pyinstallerArgs = @(
    "--onedir",
    "--name", $AppName,
    "--windowed",
    "--noconfirm",
    "--hidden-import", "concurrent",
    "--hidden-import", "concurrent.futures",
    "--collect-submodules", "PIL",
    "--add-binary", "$OxipngBin;."
)

if ($IconPath -and (Test-Path $IconPath)) {
    Write-Host "Using custom icon: $IconPath"
    $pyinstallerArgs += @("--icon", $IconPath)
} else {
    Write-Host "Icon not found. Building without custom icon."
}

$scriptPath = Join-Path $ScriptDir "fixomat.py"
pyinstaller @pyinstallerArgs $scriptPath
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: PyInstaller failed. Fix the errors above and re-run." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Debug: Show what files are in the dist folder
Write-Host ("Contents of dist\{0}:" -f $AppName) -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $DistDir $AppName) -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $($_.Name)" }
$internalDir = Join-Path $DistDir ("{0}\_internal" -f $AppName)
if (Test-Path $internalDir) {
    Write-Host ("Contents of dist\{0}\_internal (first 20):" -f $AppName) -ForegroundColor Cyan
    Get-ChildItem -Path $internalDir -ErrorAction SilentlyContinue | Select-Object -First 20 | ForEach-Object { Write-Host "  $($_.Name)" }
}
Write-Host ""

# Verify oxipng was bundled
$bundledOxipng = Join-Path $DistDir ("{0}\oxipng.exe" -f $AppName)
$bundledOxipngInternal = Join-Path $DistDir ("{0}\_internal\oxipng.exe" -f $AppName)

if (Test-Path $bundledOxipngInternal) {
    $bundledOxipng = $bundledOxipngInternal
}

if (Test-Path $bundledOxipng) {
    Write-Host "========================================"
    Write-Host "  Build Complete!"
    Write-Host "========================================"
    Write-Host ""
    Write-Host ("Output: {0}\{1}\{1}.exe" -f $DistDir, $AppName)
    Write-Host ""
    Write-Host "Bundled components verified:" -ForegroundColor Green
    Write-Host "  - $AppName.exe: OK"
    Write-Host "  - oxipng.exe: OK"
    Write-Host ""
    Write-Host "To distribute:"
    Write-Host ('  Compress-Archive -Path "{0}\{1}" -DestinationPath "Fixomat-Windows.zip"' -f $DistDir, $AppName)
    Write-Host ""
} else {
    Write-Host "========================================"
    Write-Host "  Build Warning!"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "WARNING: oxipng.exe was NOT bundled in the final build!" -ForegroundColor Red
    Write-Host "The application was built but PNG optimization will not work." -ForegroundColor Red
    Write-Host ""
    Write-Host ("Expected location: {0}" -f $bundledOxipng)
    Write-Host ""
    Write-Host "To fix, delete build and dist folders and try again:"
    Write-Host ("  Remove-Item -Recurse -Force '{0}', '{1}'" -f $BuildDir, $DistDir)
    Write-Host ""
    exit 1
}

# Deactivate virtual environment
deactivate
