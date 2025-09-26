# PowerShell script to start multiple nodes
Write-Host "Starting Distributed EHR System with Multiple Nodes..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Node 1 (Coordinator) on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js --port=3000 --node-id=node-1"

Start-Sleep -Seconds 3

Write-Host "Starting Node 2 on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js --port=3001 --node-id=node-2"

Start-Sleep -Seconds 3

Write-Host "Starting Node 3 on port 3002..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js --port=3002 --node-id=node-3"

Write-Host ""
Write-Host "All nodes started! Access the system at:" -ForegroundColor Green
Write-Host "- Node 1: http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Node 2: http://localhost:3001" -ForegroundColor Cyan
Write-Host "- Node 3: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
