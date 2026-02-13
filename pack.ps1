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

# Ensure Windows app icon exists (electron-builder uses build/icon.png or build/icon.ico)
$buildDir = Join-Path $PSScriptRoot "build"
$iconSrc = Join-Path $PSScriptRoot "src\renderer\assets\novi_logo.png"
$iconDst = Join-Path $buildDir "icon.png"
if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir | Out-Null }
if (Test-Path $iconSrc) {
    Copy-Item -Path $iconSrc -Destination $iconDst -Force
    Write-Host "App icon: build/icon.png" -ForegroundColor Cyan
}

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

# Create a shortcut that runs the unpacked exe (stable path) so pin-to-taskbar works
$unpackedExe = Join-Path $PSScriptRoot "dist\win-unpacked\Nova.exe"
if (Test-Path $unpackedExe) {
    $shortcutPath = Join-Path $PSScriptRoot "dist\Nova.lnk"
    $wsh = New-Object -ComObject WScript.Shell
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = (Resolve-Path $unpackedExe).Path
    $shortcut.WorkingDirectory = (Split-Path (Resolve-Path $unpackedExe).Path)
    $shortcut.Save()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($wsh) | Out-Null
    Write-Host "Created dist\Nova.lnk -> win-unpacked\Nova.exe (use this to run; pin to taskbar works)" -ForegroundColor Green
}

Write-Host "Packaging complete!" -ForegroundColor Green

