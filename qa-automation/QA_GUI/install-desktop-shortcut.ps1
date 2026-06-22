$ErrorActionPreference = "Stop"

$guiRoot = $PSScriptRoot
$qaAutomationRoot = Split-Path -Parent $guiRoot
$launcher = Join-Path $guiRoot "start-workshop-qa.ps1"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Workshop QA.lnk"
$powerShell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

function Assert-Command {
  param(
    [string] $Name,
    [string] $InstallHint
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "$Name was not found. $InstallHint"
  }

  return $command.Source
}

$nodePath = Assert-Command "node" "Install Node.js 20 or later."
$npmPath = Assert-Command "npm.cmd" "Install Node.js 20 or later."

$playwrightModule = Join-Path $qaAutomationRoot "node_modules\playwright"
if (-not (Test-Path $playwrightModule)) {
  Push-Location $qaAutomationRoot
  try {
    & $npmPath install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powerShell
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
$shortcut.WorkingDirectory = $guiRoot
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,167"
$shortcut.Description = "Start Workshop QA"
$shortcut.Save()

Write-Host "Created Desktop shortcut: $shortcutPath"
Write-Host "Node: $nodePath"
