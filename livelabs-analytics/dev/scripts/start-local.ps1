$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$baseUrl = 'http://127.0.0.1:4175'

function Assert-AnalyticsServer {
    $page = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 4
    $api = Invoke-WebRequest -Uri "$baseUrl/api/dashboard-admin-state" -UseBasicParsing -TimeoutSec 10
    if ($page.StatusCode -ne 200 -or $api.StatusCode -ne 200 -or
        -not $page.Content.Contains('data-dashboard-tab="urgent"') -or
        -not $page.Content.Contains('data-dashboard-tab="at-risk"')) {
        throw 'The service is not the current Analytics application.'
    }
    $null = $api.Content | ConvertFrom-Json
}

$reachable = $false
try { $null = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 2; $reachable = $true } catch {
    if ($_.Exception.Response) { $reachable = $true }
}
if ($reachable) {
    Assert-AnalyticsServer
    Write-Output "Current Analytics app is already running: $baseUrl/dashboard/"
    exit 0
}

$python = (Get-Command python -ErrorAction Stop).Source
$logs = Join-Path $projectRoot 'dev\logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$process = Start-Process -FilePath $python -ArgumentList 'dev/scripts/admin-server.py --host 127.0.0.1 --port 4175' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs "app-$stamp.stdout.log") -RedirectStandardError (Join-Path $logs "app-$stamp.stderr.log")
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($process.HasExited) { throw "Analytics exited; inspect dev/logs/app-$stamp.stderr.log." }
    try {
        Assert-AnalyticsServer
        $process.Id | Set-Content -LiteralPath (Join-Path $logs 'local-server.pid')
        Write-Output "Analytics running (PID $($process.Id)): $baseUrl/dashboard/"
        exit 0
    } catch { if ($attempt -eq 19) { throw } }
}
