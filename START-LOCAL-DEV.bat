@echo off
title Swastik Art - Local Live Development App
color 0A

echo ========================================================
echo       SWASTIK ART ^& ASTHA FASHION - LOCAL DEV APP
echo ========================================================
echo.
echo [1/3] Checking Backend Server (Port 5000)...
netstat -ano | findstr :5000 >nul
if %errorlevel% neq 0 (
    echo [*] Starting Local Backend Server in background...
    start "Swastik Art - Backend (Port 5000)" /min cmd /c "cd /d d:\swastik-art\BACKEND && node server.js"
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Backend Server is already active on Port 5000.
)

echo.
echo [2/3] Checking Frontend Dev Server (Port 5173)...
netstat -ano | findstr :5173 >nul
if %errorlevel% neq 0 (
    echo [*] Starting Vite Dev Server in background...
    start "Swastik Art - Vite Dev (Port 5173)" /min cmd /c "cd /d d:\swastik-art\FROUNTEND && npm run dev"
    timeout /t 4 /nobreak >nul
) else (
    echo [OK] Vite Dev Server is already active on Port 5173.
)

echo.
echo [3/3] Launching Swastik Art Desktop Application (with Live Reload)...
echo.
echo ====================================================================
echo  TIPS: 
echo  - Koi pan code ma change karso etle app ma tarat j update thai jase!
echo  - Koi Build banavani jarur nathi (No build required for testing!)
echo  - Browser ma jova mate: http://localhost:5173
echo ====================================================================
echo.

cd /d "d:\swastik-art\FROUNTEND"
npm run electron:dev

pause

