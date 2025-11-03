# Windows Packaging Verification Guide

This document provides verification steps for Task 6: Windows Packaging.

## Prerequisites

- Windows 10/11
- Node.js 22+
- npm installed
- All dependencies installed (`npm install`)

## Configuration Verification

The packaging configuration has been verified through unit tests. Key settings:

- ✅ **productName**: "Nova"
- ✅ **appId**: "studio.miranova.nova"
- ✅ **electron-builder**: Installed and configured
- ✅ **Windows targets**: Portable EXE and NSIS installer

## Building Packages

### Build Portable EXE

```powershell
npm run pack:win
```

**Expected Output:**
- Compiles TypeScript to `dist/`
- Creates portable executable in `dist/win-unpacked/` or `dist/`
- File name: `Nova 0.0.1.exe` (or similar, based on version)

**Verification Steps:**
1. Check that `dist/` directory contains the executable
2. Executable should be a single portable file (no installer)
3. File size should be reasonable (typically 100-200MB for Electron apps)

### Build NSIS Installer

```powershell
npm run pack:win:exe
```

**Expected Output:**
- Compiles TypeScript to `dist/`
- Creates NSIS installer executable in `dist/`
- File name: `Nova Setup 0.0.1.exe` (or similar)

**Verification Steps:**
1. Check that `dist/` directory contains the installer
2. Installer should be a single `.exe` file
3. File size should be reasonable (typically 100-200MB)

## Manual Testing Checklist

After building, manually verify:

### Portable EXE Testing

- [ ] Double-click the executable to launch Nova
- [ ] Application window opens successfully
- [ ] Welcome screen displays correctly (Miranova Studios logo and tagline)
- [ ] Window can be resized and moved
- [ ] Window position/size persists after closing and reopening
- [ ] Application closes cleanly
- [ ] No console errors or warnings
- [ ] Logs are created in `%APPDATA%\Nova\logs\YYYY-MM-DD.log`

### NSIS Installer Testing

- [ ] Run the installer executable
- [ ] Installation wizard appears
- [ ] Can select installation directory
- [ ] Installation completes successfully
- [ ] Application launches after installation
- [ ] Application can be launched from Start Menu or desktop shortcut
- [ ] Application can be uninstalled via Windows Settings/Control Panel
- [ ] All functionality works as expected after installation

## Troubleshooting

### Build Fails

1. **Ensure all dependencies are installed:**
   ```powershell
   npm install
   ```

2. **Clean build artifacts:**
   ```powershell
   npm run clean
   ```

3. **Verify TypeScript compiles:**
   ```powershell
   npm run build
   ```

### Executable Doesn't Launch

1. Check Windows Event Viewer for errors
2. Check logs in `%APPDATA%\Nova\logs\`
3. Verify all required files are included in the package
4. Check for missing dependencies

### SmartScreen Warning

- Expected behavior: Windows may show SmartScreen warning for unsigned executables
- This is normal for development builds
- Users can click "More info" → "Run anyway" to proceed
- For production, code signing certificate would be required

## Build Output Locations

- **Portable EXE**: `dist/win-unpacked/Nova.exe` or `dist/Nova 0.0.1.exe`
- **NSIS Installer**: `dist/Nova Setup 0.0.1.exe`
- **Build artifacts**: `dist/` directory

## Notes

- Builds are unsigned by design at this stage
- Windows Defender/SmartScreen may flag unsigned executables
- All builds include the full Electron runtime (~100MB+)
- Build time depends on system performance (typically 1-3 minutes)

## Automated Testing

Unit tests verify the configuration:

```powershell
npm test -- packaging.test.ts
```

These tests verify:
- electron-builder is installed
- productName and appId are configured correctly
- Windows targets are configured
- Packaging scripts are set up correctly

