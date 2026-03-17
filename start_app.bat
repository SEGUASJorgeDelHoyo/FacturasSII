@echo off
setlocal
cd /d %~dp0

echo Iniciando proxy...
start /B "" python proxy.py > proxy.log 2>&1

echo Abriendo navegador...
start "" "chrome.exe" "http://localhost:3000/MainPage.html"

echo Esperando a que el servidor se apague (boton Detener servidor en la web)...
:WAIT_LOOP
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3000); $c.Close(); exit 1 } catch { exit 0 }"
if %ERRORLEVEL% equ 1 (
    timeout /t 1 > nul
    goto WAIT_LOOP
)

echo Servidor ya no responde en 3000. Limpiando procesos Python...
taskkill /f /im python.exe >nul 2>&1
echo Listo, app detenida. Esta ventana se cierra en 2 segundos...
timeout /t 2 > nul
exit