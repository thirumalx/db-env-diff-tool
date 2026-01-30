@echo off
setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set APP_DIR=%~dp0

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if we're in standalone mode (after packaging)
if exist "%APP_DIR%.next\standalone\server.js" (
    REM Running from standalone build
    cd /d "%APP_DIR%.next\standalone"
    start "" http://localhost:2214
    timeout /t 2 /nobreak
    node server.js
) else (
    REM Running from development directory
    cd /d "%APP_DIR%"
    
    REM Install dependencies if not present
    if not exist "node_modules" (
        echo Installing dependencies...
        call npm install
    )
    
    REM Build if .next doesn't exist
    if not exist ".next" (
        echo Building application...
        call npm run build
    )
    
    echo Starting application on http://localhost:2214
    echo Launching browser...
    start "" http://localhost:2214
    
    REM Wait for browser to open
    timeout /t 2 /nobreak
    
    REM Start the server
    call npm start
)

pause
