@echo off
title Herramienta SII Odoo
cd /d "%~dp0"

echo Iniciando servidor interno...
:: Iniciamos el proxy de Python en segundo plano
start /B "" python proxy.py > proxy.log 2>&1

:: Damos 2 segundos para asegurar que el servidor esta escuchando
timeout /t 2 > nul

echo Abriendo aplicacion...
:: Usamos Chrome en modo APP para que parezca un programa nativo y permita usar window.close()
start chrome --app="http://localhost:3000/MainPage.html"

echo El servidor esta en ejecucion.
echo Por favor, usa el boton "Detener servidor" en la aplicacion para cerrar todo.

:: Bucle para comprobar si el puerto 3000 sigue activo
:WAIT_LOOP
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3000); $c.Close(); exit 1 } catch { exit 0 }"
if %ERRORLEVEL% equ 1 (
    timeout /t 1 > nul
    goto WAIT_LOOP
)

:: Cuando el proxy se cierra (por la peticion /shutdown), el script llega aqui y se auto-cierra
exit