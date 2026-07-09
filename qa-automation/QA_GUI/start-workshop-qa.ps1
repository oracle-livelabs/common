$ErrorActionPreference = "Stop"

$appUrl = "http://127.0.0.1:8787/"
$healthUrl = "http://127.0.0.1:8787/api/health"
$guiRoot = $PSScriptRoot
$qaAutomationRoot = Split-Path -Parent $guiRoot
$serverScript = Join-Path $guiRoot "scripts\workshop-qa-app.mjs"

function Test-WorkshopQaRunning {
  try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    return $response.ok -eq $true
  } catch {
    return $false
  }
}

function Show-LauncherError {
  param([string] $Message)

  try {
    $shell = New-Object -ComObject WScript.Shell
    $null = $shell.Popup($Message, 0, "Workshop QA", 16)
  } catch {
    Write-Host $Message
  }
}

try {
  if (-not (Test-WorkshopQaRunning)) {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
      throw "Node.js was not found. Install Node.js 20 or later, then run the Workshop QA installer again."
    }

    Start-Process `
      -WindowStyle Hidden `
      -FilePath $node.Source `
      -ArgumentList @($serverScript, "--port", "8787") `
      -WorkingDirectory $qaAutomationRoot

    $started = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      Start-Sleep -Milliseconds 500
      if (Test-WorkshopQaRunning) {
        $started = $true
        break
      }
    }

    if (-not $started) {
      throw "Workshop QA did not start on port 8787. Check whether another app is already using that port."
    }
  }

  Start-Process $appUrl
} catch {
  Show-LauncherError ($_.Exception.Message)
  exit 1
}
