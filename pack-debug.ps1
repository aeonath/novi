# Debug version of pack script with verbose output
# This helps identify where electron-builder is hanging

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
$env:DEBUG = "electron-builder*"

Write-Host "Running electron-builder with debug output..." -ForegroundColor Cyan
Write-Host "This will show detailed progress..." -ForegroundColor Yellow

# Try building just the unpacked directory first (faster, tests if basic packaging works)
Write-Host "`nStep 1: Testing unpacked directory build..." -ForegroundColor Cyan
npx electron-builder --win --dir

if ($LASTEXITCODE -ne 0) {
    Write-Host "Unpacked directory build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Building portable executable..." -ForegroundColor Cyan
npx electron-builder --win portable --debug

if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Packaging complete!" -ForegroundColor Green

