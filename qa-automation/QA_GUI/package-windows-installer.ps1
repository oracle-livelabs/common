param(
  [string] $OutputDir = (Join-Path (Split-Path -Parent $PSScriptRoot) "artifacts\dist"),
  [switch] $SkipExe
)

$ErrorActionPreference = "Stop"

$guiRoot = $PSScriptRoot
$qaAutomationRoot = Split-Path -Parent $guiRoot
$packageName = "Workshop-QA-Windows"
$zipName = "$packageName.zip"
$exeName = "Workshop-QA-Setup.exe"
$stageRoot = Join-Path ([IO.Path]::GetTempPath()) "workshop-qa-package-$([guid]::NewGuid().ToString("N"))"
$appStage = Join-Path $stageRoot $packageName
$payloadRoot = Join-Path $stageRoot "payload"

function Copy-GuiSource {
  param([string] $Destination)

  New-Item -ItemType Directory -Force $Destination | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $guiRoot -Force) {
    if ($item.Name -eq "artifacts") {
      continue
    }

    Copy-Item -LiteralPath $item.FullName -Destination $Destination -Recurse -Force
  }
}

function Write-BootstrapScript {
  param([string] $Path)

  @'
$ErrorActionPreference = "Stop"

$packageZip = Join-Path $PSScriptRoot "Workshop-QA-Windows.zip"
$installRoot = Join-Path $env:LOCALAPPDATA "Workshop QA"
$extractRoot = Join-Path ([IO.Path]::GetTempPath()) "workshop-qa-install-$([guid]::NewGuid().ToString("N"))"

function Show-InstallError {
  param([string] $Message)

  try {
    $shell = New-Object -ComObject WScript.Shell
    $null = $shell.Popup($Message, 0, "Workshop QA Setup", 16)
  } catch {
    Write-Host $Message
  }
}

try {
  if (-not (Test-Path $packageZip)) {
    throw "Missing package payload: $packageZip"
  }

  New-Item -ItemType Directory -Force $extractRoot | Out-Null
  New-Item -ItemType Directory -Force $installRoot | Out-Null

  Expand-Archive -LiteralPath $packageZip -DestinationPath $extractRoot -Force
  Copy-Item -LiteralPath (Join-Path $extractRoot "Workshop-QA-Windows\*") -Destination $installRoot -Recurse -Force

  $installer = Join-Path $installRoot "QA_GUI\install-desktop-shortcut.ps1"
  $launcher = Join-Path $installRoot "QA_GUI\start-workshop-qa.ps1"
  if (-not (Test-Path $installer)) {
    throw "Installer script was not found after extraction."
  }

  & $installer
  if ($LASTEXITCODE -ne 0) {
    throw "Desktop shortcut installation failed with exit code $LASTEXITCODE."
  }

  if (Test-Path $launcher) {
    & $launcher
  }
} catch {
  Show-InstallError ($_.Exception.Message)
  exit 1
}
'@ | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Write-IExpressSed {
  param(
    [string] $Path,
    [string] $PayloadDirectory,
    [string] $TargetExe
  )

  $escapedPayloadDirectory = $PayloadDirectory.TrimEnd("\")
  @"
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Workshop QA installed.
TargetName=$TargetExe
FriendlyName=Workshop QA Setup
AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File install-workshop-qa.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles

[Strings]
FILE0="install-workshop-qa.ps1"
FILE1="$zipName"

[SourceFiles]
SourceFiles0=$escapedPayloadDirectory

[SourceFiles0]
%FILE0%=
%FILE1%=
"@ | Set-Content -LiteralPath $Path -Encoding ASCII
}

New-Item -ItemType Directory -Force $OutputDir | Out-Null
New-Item -ItemType Directory -Force $appStage | Out-Null
New-Item -ItemType Directory -Force $payloadRoot | Out-Null

Copy-Item -LiteralPath (Join-Path $qaAutomationRoot "package.json") -Destination $appStage -Force
Copy-Item -LiteralPath (Join-Path $qaAutomationRoot "package-lock.json") -Destination $appStage -Force
Copy-GuiSource -Destination (Join-Path $appStage "QA_GUI")

$zipPath = Join-Path $OutputDir $zipName
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $appStage -DestinationPath $zipPath -Force

Copy-Item -LiteralPath $zipPath -Destination (Join-Path $payloadRoot $zipName) -Force
$bootstrapScript = Join-Path $payloadRoot "install-workshop-qa.ps1"
Write-BootstrapScript -Path $bootstrapScript

$exePath = Join-Path $OutputDir $exeName
if (-not $SkipExe) {
  $iexpress = Join-Path $env:SystemRoot "System32\iexpress.exe"
  if (-not (Test-Path $iexpress)) {
    throw "IExpress was not found at $iexpress. Use the ZIP output instead."
  }

  if (Test-Path $exePath) {
    Remove-Item -LiteralPath $exePath -Force
  }

  $sedPath = Join-Path $payloadRoot "workshop-qa.sed"
  Write-IExpressSed -Path $sedPath -PayloadDirectory $payloadRoot -TargetExe $exePath

  & $iexpress /N /Q $sedPath
  if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "IExpress failed with exit code $LASTEXITCODE."
  }
  for ($attempt = 0; $attempt -lt 20 -and -not (Test-Path $exePath); $attempt++) {
    Start-Sleep -Milliseconds 500
  }
  if (-not (Test-Path $exePath)) {
    throw "IExpress did not create $exePath."
  }
}

Write-Host "Wrote package ZIP: $zipPath"
if (-not $SkipExe) {
  Write-Host "Wrote setup EXE: $exePath"
}
