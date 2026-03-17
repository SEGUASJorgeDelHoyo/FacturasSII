@echo off
REM Mata procesos Python y Chrome iniciados por el script
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im chrome.exe >nul 2>&1

echo Procesos detenidos.
pause