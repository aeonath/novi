# PowerShell script for Windows packaging
# This script handles environment variables and electron-builder execution

Write-Host "Cleaning previous builds..." -ForegroundColor Cyan
npm run clean

Write-Host "Building TypeScript..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Setting environment variables..." -ForegroundColor Cyan
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:ELECTRON_BUILDER_NSIS_SKIP_SIGNING = "true"

Write-Host "Running electron-builder..." -ForegroundColor Cyan
if ($args[0] -eq "exe") {
    npx electron-builder --win nsis
} else {
    npx electron-builder --win portable
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Packaging complete!" -ForegroundColor Green

