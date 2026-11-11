@echo off
setlocal
REM Minimal CMD entrypoint that forwards all arguments to the Playwright runner.
set "ROOT=%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH.
  exit /b 1
)

node "%ROOT%scripts\qa.mjs" %*
exit /b %ERRORLEVEL%
