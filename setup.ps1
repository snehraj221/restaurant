# Royal Indian Rasoi - Student Project Setup Script (Windows)

Write-Host "--- Starting Royal Indian Rasoi Setup ---" -ForegroundColor Gold

# 1. Add Node.js to current session path if missing
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    $newNodePath = "C:\Program Files\nodejs"
    if (Test-Path $newNodePath) {
        Write-Host "Node.js found but not in PATH. Adding to current session..." -ForegroundColor Yellow
        $env:Path += ";$newNodePath"
    } else {
        Write-Host "Error: Node.js is not installed. Please install it from https://nodejs.org" -ForegroundColor Red
        exit
    }
}

# 2. Install NPM dependencies
Write-Host "Installing project dependencies..." -ForegroundColor Cyan
npm install

# 3. Inform about Database
Write-Host "SQLite Database selected for simplicity. No external database service required." -ForegroundColor Green
Write-Host "The database file 'database.sqlite' will be automatically created." -ForegroundColor White

# 4. Start the Application
Write-Host "Setup finished! Starting the web server..." -ForegroundColor Green
npm start
