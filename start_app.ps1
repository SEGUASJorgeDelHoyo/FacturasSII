$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptPath

$proxy = Start-Process -FilePath python -ArgumentList "proxy.py" -PassThru
$server = Start-Process -FilePath python -ArgumentList "-m http.server 8000" -PassThru

Start-Sleep -Seconds 2
Start-Process "chrome.exe" "http://localhost:8000/MainPage.html"

Write-Host "Proxy PID=$($proxy.Id), web PID=$($server.Id). Presiona ENTER para cerrar todo."
Read-Host

Stop-Process -Id $proxy.Id -ErrorAction SilentlyContinue
Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
Pop-Location
