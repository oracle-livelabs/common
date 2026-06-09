# OptiShot Uninstall Script for Windows
# Usage: Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('<URL>/uninstall-windows.ps1'))

$ErrorActionPreference = "SilentlyContinue"

$InstallDir = "$env:LOCALAPPDATA\Programs\OptiShot"
$ShortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\OptiShot.lnk"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    OptiShot Uninstaller for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$removed = $false

# Remove Start Menu shortcut
if (Test-Path $ShortcutPath) {
    Write-Host "Removing Start Menu shortcut..." -ForegroundColor Yellow
    Remove-Item -Path $ShortcutPath -Force
    Write-Host "  Shortcut removed." -ForegroundColor Green
    $removed = $true
}

# Remove installation directory
if (Test-Path $InstallDir) {
    Write-Host "Removing OptiShot from $InstallDir..." -ForegroundColor Yellow
    Remove-Item -Path $InstallDir -Recurse -Force
    Write-Host "  Application removed." -ForegroundColor Green
    $removed = $true
}

Write-Host ""
if ($removed) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  OptiShot uninstalled successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "OptiShot is not installed." -ForegroundColor Yellow
    Write-Host "Nothing to uninstall."
}
Write-Host ""
