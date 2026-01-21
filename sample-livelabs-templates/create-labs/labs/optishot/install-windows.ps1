# OptiShot Installation Script for Windows (x64)
# Usage: Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('<URL>/install-windows.ps1'))

$ErrorActionPreference = "Stop"

$DownloadUrl = "https://c4u04.objectstorage.us-ashburn-1.oci.customer-oci.com/p/EcTjWk2IuZPZeNnD_fYMcgUhdNDIDA6rt9gaFj_WZMiL7VvxPBNMY60837hu5hga/n/c4u04/b/livelabsfiles/o/optishot/OptiShot-Windows.zip"
$InstallDir = "$env:LOCALAPPDATA\Programs\OptiShot"
$TempDir = "$env:TEMP\OptiShot_Install"
$StartMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"

Write-Host "Installing OptiShot..." -ForegroundColor Cyan
Write-Host ""

# Create temp directory
if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# Download
Write-Host "Downloading OptiShot..."
$ZipPath = "$TempDir\OptiShot.zip"
Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing

# Extract
Write-Host "Extracting..."
Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force

# Create installation directory
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Install
Write-Host "Installing to $InstallDir..."
Copy-Item -Path "$TempDir\OptiShot\*" -Destination $InstallDir -Recurse -Force

# Create Start Menu shortcut
Write-Host "Creating Start Menu shortcut..."
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$StartMenuDir\OptiShot.lnk")
$Shortcut.TargetPath = "$InstallDir\OptiShot.exe"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "OptiShot - Image Optimization Tool"
$Shortcut.Save()

# Cleanup
Remove-Item -Path $TempDir -Recurse -Force

Write-Host ""
Write-Host "OptiShot installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Installation location: $InstallDir"
Write-Host ""
Write-Host "To launch:"
Write-Host "  - Search for 'OptiShot' in the Start Menu"
Write-Host "  - Or run: $InstallDir\OptiShot.exe"
Write-Host ""
Write-Host "Note: On first launch, click 'More info' then 'Run anyway'"
Write-Host "if Windows SmartScreen shows a warning."
