# `run.ps1` is the only PowerShell entrypoint the simplified framework needs.
# It resolves Node and forwards all arguments to the Playwright project runner.
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$nodeExe = Get-Command node -ErrorAction SilentlyContinue
$runScript = Join-Path $projectRoot "scripts\qa.mjs"

if (-not $nodeExe) {
    Write-Error "Node.js was not found on PATH."
    exit 1
}

& $nodeExe.Source $runScript @args
exit $LASTEXITCODE
