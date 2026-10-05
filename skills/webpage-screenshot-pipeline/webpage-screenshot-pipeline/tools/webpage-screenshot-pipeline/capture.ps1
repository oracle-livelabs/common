[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$ViewportWidth = 1440,
  [int]$ViewportHeight = 900,
  [switch]$FullPage,
  [ValidateSet('chromium','chrome','msedge')][string]$BrowserChannel = 'chromium'
)
$ErrorActionPreference = 'Stop'
$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeModules = Join-Path $toolRoot 'node_modules'
if (-not (Test-Path (Join-Path $nodeModules 'playwright'))) {
  throw "Playwright is not installed under $toolRoot. Run: powershell -ExecutionPolicy Bypass -File `"$toolRoot\setup.ps1`""
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required to run the local Playwright capture.' }
$fullPageValue = if ($FullPage) { 'true' } else { 'false' }
& node (Join-Path $toolRoot 'capture.mjs') $Url $OutputPath $ViewportWidth $ViewportHeight $fullPageValue $BrowserChannel
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
