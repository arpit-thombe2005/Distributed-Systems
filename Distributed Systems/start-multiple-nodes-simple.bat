@echo off
echo Starting Distributed EHR System with Multiple Nodes...
echo.

echo Starting Node 1 (Coordinator) on port 3000...
start "Node 1" cmd /k "node server.js --port=3000 --node-id=node-1"

timeout /t 3 /nobreak >nul

echo Starting Node 2 on port 3001...
start "Node 2" cmd /k "node server.js --port=3001 --node-id=node-2"

timeout /t 3 /nobreak >nul

echo Starting Node 3 on port 3002...
start "Node 3" cmd /k "node server.js --port=3002 --node-id=node-3"

echo.
echo All nodes started! Access the system at:
echo - Node 1: http://localhost:3000
echo - Node 2: http://localhost:3001  
echo - Node 3: http://localhost:3002
echo.
echo Press any key to exit...
pause >nul
