@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-desktop-shortcut.ps1"
echo.
pause
