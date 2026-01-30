$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 2214

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "Found Node.js: $nodeVersion"
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Push-Location $AppDir

# Check if running from standalone build
if (Test-Path ".next\standalone\server.js") {
    Write-Host "Starting application from standalone build..." -ForegroundColor Green
    Set-Location ".next\standalone"
    
    # Open browser
    Start-Process "http://localhost:$port"
    Start-Sleep -Seconds 2
    
    # Start server
    & node server.js
} else {
    Write-Host "Starting application from development directory..." -ForegroundColor Green
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Cyan
        & npm install
    }
    
    # Build if needed
    if (-not (Test-Path ".next")) {
        Write-Host "Building application..." -ForegroundColor Cyan
        & npm run build
    }
    
    # Open browser
    Write-Host "Opening browser at http://localhost:$port..." -ForegroundColor Green
    Start-Process "http://localhost:$port"
    Start-Sleep -Seconds 2
    
    # Start the server
    & npm start
}

Pop-Location
