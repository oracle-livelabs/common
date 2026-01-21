# OptiShot Installation Script for Windows (x64)
# Usage: Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('<URL>/install-windows.ps1'))

$ErrorActionPreference = "Stop"

$DownloadUrl = "https://c4u04.objectstorage.us-ashburn-1.oci.customer-oci.com/p/EcTjWk2IuZPZeNnD_fYMcgUhdNDIDA6rt9gaFj_WZMiL7VvxPBNMY60837hu5hga/n/c4u04/b/livelabsfiles/o/optishot/OptiShot-Windows.zip"
$InstallDir = "$env:LOCALAPPDATA\Programs\OptiShot"
$TempDir = "$env:TEMP\OptiShot_Install"
$StartMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       OptiShot Installer for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create temp directory
if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# Download
Write-Host "[1/5] Downloading OptiShot..." -ForegroundColor Yellow
$ZipPath = "$TempDir\OptiShot.zip"
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
    Write-Host "      Download complete." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to download. Check your internet connection." -ForegroundColor Red
    exit 1
}

# Extract
Write-Host "[2/5] Extracting..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force
    Write-Host "      Extraction complete." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to extract zip file." -ForegroundColor Red
    exit 1
}

# Create installation directory
Write-Host "[3/5] Installing to $InstallDir..." -ForegroundColor Yellow
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Copy files
try {
    Copy-Item -Path "$TempDir\OptiShot\*" -Destination $InstallDir -Recurse -Force
    Write-Host "      Installation complete." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to copy files." -ForegroundColor Red
    exit 1
}

# Create Start Menu shortcut
Write-Host "[4/5] Creating Start Menu shortcut..." -ForegroundColor Yellow
$ShortcutPath = "$StartMenuDir\OptiShot.lnk"
$TargetPath = "$InstallDir\OptiShot.exe"

try {
    # Ensure Start Menu Programs directory exists
    if (-not (Test-Path $StartMenuDir)) {
        New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null
    }

    # Remove existing shortcut if present
    if (Test-Path $ShortcutPath) {
        Remove-Item -Path $ShortcutPath -Force
    }

    # Create shortcut using WScript.Shell COM object
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $TargetPath
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "OptiShot - Image Optimization Tool for LiveLabs"
    $Shortcut.IconLocation = "$TargetPath,0"
    $Shortcut.Save()

    # Verify shortcut was created
    if (Test-Path $ShortcutPath) {
        Write-Host "      Start Menu shortcut created." -ForegroundColor Green
    } else {
        Write-Host "      WARNING: Shortcut may not have been created." -ForegroundColor Yellow
    }
} catch {
    Write-Host "      WARNING: Could not create Start Menu shortcut." -ForegroundColor Yellow
    Write-Host "      Error: $_" -ForegroundColor Yellow
}

# Cleanup
Write-Host "[5/5] Cleaning up..." -ForegroundColor Yellow
Remove-Item -Path $TempDir -Recurse -Force
Write-Host "      Cleanup complete." -ForegroundColor Green

# Success message
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   OptiShot installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installation location:" -ForegroundColor Cyan
Write-Host "  $InstallDir"
Write-Host ""
Write-Host "To launch OptiShot:" -ForegroundColor Cyan
Write-Host "  - Click Start Menu and search for 'OptiShot'"
Write-Host "  - Or run: $TargetPath"
Write-Host ""
Write-Host "Shortcut location:" -ForegroundColor Cyan
Write-Host "  $ShortcutPath"
Write-Host ""
Write-Host "NOTE: On first launch, if Windows SmartScreen appears," -ForegroundColor Yellow
Write-Host "      click 'More info' then 'Run anyway'." -ForegroundColor Yellow
Write-Host ""
