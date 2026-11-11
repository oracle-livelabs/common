# Fixomat Installation Script for Windows (x64)
# Usage: Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('<URL>/install-windows.ps1'))

$ErrorActionPreference = "Stop"

$AppName = "LiveLabs Fixomat 2000"
$ExeName = "$AppName.exe"
$InstallDir = "$env:LOCALAPPDATA\Programs\$AppName"
$TempDir = "$env:TEMP\Fixomat_Install"
$StartMenuDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$ShortcutPath = "$StartMenuDir\$AppName.lnk"
$DownloadUrl = if ($env:FIXOMAT_DOWNLOAD_URL) {
    $env:FIXOMAT_DOWNLOAD_URL
} else {
    "https://c4u04.objectstorage.us-ashburn-1.oci.customer-oci.com/p/EcTjWk2IuZPZeNnD_fYMcgUhdNDIDA6rt9gaFj_WZMiL7VvxPBNMY60837hu5hga/n/c4u04/b/livelabsfiles/o/fixomat/Fixomat-Windows.zip"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   $AppName Installer for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$ZipPath = "$TempDir\fixomat.zip"

try {
    Write-Host "[1/5] Downloading package..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
    Write-Host "      Download complete." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to download package." -ForegroundColor Red
    exit 1
}

try {
    Write-Host "[2/5] Extracting package..." -ForegroundColor Yellow
    Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force
    Write-Host "      Extraction complete." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to extract package." -ForegroundColor Red
    exit 1
}

$ExeCandidate = Get-ChildItem -Path $TempDir -Recurse -File -Filter "*.exe" |
    Where-Object { $_.Name -eq $ExeName -or $_.Name -match "Fixomat" } |
    Select-Object -First 1

if (-not $ExeCandidate) {
    Write-Host "      ERROR: Could not locate a Fixomat executable in extracted files." -ForegroundColor Red
    Write-Host "      Verify the download URL points to a valid Windows package." -ForegroundColor Red
    exit 1
}

$PayloadRoot = $ExeCandidate.Directory.FullName

Write-Host "[3/5] Installing to $InstallDir..." -ForegroundColor Yellow
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path "$PayloadRoot\*" -Destination $InstallDir -Recurse -Force
Write-Host "      Installation complete." -ForegroundColor Green

$TargetPath = Join-Path $InstallDir $ExeCandidate.Name

Write-Host "[4/5] Creating Start Menu shortcut..." -ForegroundColor Yellow
if (-not (Test-Path $StartMenuDir)) {
    New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null
}
if (Test-Path $ShortcutPath) {
    Remove-Item -Path $ShortcutPath -Force
}

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $TargetPath
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "$AppName - LiveLabs Markdown and image fixer"
    $Shortcut.IconLocation = "$TargetPath,0"
    $Shortcut.Save()
    Write-Host "      Shortcut created." -ForegroundColor Green
} catch {
    Write-Host "      WARNING: Unable to create Start Menu shortcut." -ForegroundColor Yellow
    Write-Host "      You can still run: $TargetPath" -ForegroundColor Yellow
}

Write-Host "[5/5] Cleaning up..." -ForegroundColor Yellow
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "      Cleanup complete." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  $AppName installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installation location:" -ForegroundColor Cyan
Write-Host "  $InstallDir"
Write-Host ""
Write-Host "Launch options:" -ForegroundColor Cyan
Write-Host "  - Search for '$AppName' in Start Menu"
Write-Host "  - Or run: $TargetPath"
Write-Host ""
