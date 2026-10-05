[CmdletBinding()]
param([ValidateSet('chromium','chrome','msedge')][string]$BrowserChannel = 'chromium')
$ErrorActionPreference = 'Stop'
$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required. Install Node.js, then rerun setup.ps1.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required. Install npm with Node.js, then rerun setup.ps1.' }
Push-Location $toolRoot
try {
    $env:npm_config_cache = Join-Path $toolRoot '.npm-cache'
    npm install --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed. Check network access and npm configuration.' }
    if ($BrowserChannel -eq 'chromium') {
        npx playwright install chromium
        if ($LASTEXITCODE -ne 0) { throw 'Chromium installation failed. Check network access or rerun setup with -BrowserChannel chrome or -BrowserChannel msedge when that browser is installed.' }
    } else {
        Write-Host "Skipping Playwright browser download; capture will use installed $BrowserChannel."
    }
    Write-Host "Playwright setup complete under $toolRoot"
} finally { Pop-Location }
