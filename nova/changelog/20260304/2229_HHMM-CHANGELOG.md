# Changelog — 2026-03-04 22:29

## Summary
Cross-platform Linux support: build system, terminal shell detection, icon handling, and OSC 7 path fix.

## Changes

### buildit.sh — Cross-platform build script
- Rewrote from PowerShell wrapper to platform-aware bash script
- Auto-detects OS: `deb` on Linux, `portable` on Windows
- Supports explicit targets: `./buildit.sh [deb|win|exe]`

### package.json — Linux build config & repo updates
- Added `linux` build config with `deb` target, `x64` arch, `Development` category
- Added `pack:deb` npm script
- Added `copy:icon` to all `pack:*` scripts
- Updated `copy:icon` to use `icon.png` (square) instead of `novi_logo.png` (banner)
- `copy:icon` now generates sized icons (16–512px) via ImageMagick for Linux desktop integration
- `linux.icon` points to `build/icons/` directory so electron-builder installs proper hicolor sizes
- Updated author to `Aeonath <aeonath@miranova.studio>` (required for .deb maintainer field)
- Updated repository URL to `https://github.com/aeonath/novi`

### src/main/services/terminal-service.ts — Platform-aware shell detection
- Renamed `getBashPath()` → `getShellPath()`
- On Linux/macOS: uses `$SHELL`, falls back to `/bin/bash`, `/usr/bin/bash`, `/bin/sh`
- Windows logic unchanged (Git bash → system bash → cmd.exe)

### src/main/main.ts — OSC 7 path fix
- Fixed regex capture group to include leading `/` in extracted path
- Before: `file://localhost/home/user` → `home/user` (missing leading slash)
- After: `file://localhost/home/user` → `/home/user`

### src/renderer/assets/icon.png — Trimmed icon
- Trimmed whitespace padding around the N logo for larger appearance in desktop environments

### src/tests/core-0.4.0/terminal-service.test.ts — Platform-aware tests
- Updated shell detection tests to branch by platform
- Linux: tests `$SHELL`, `/bin/bash`, `/bin/sh` fallbacks
- Windows: tests Git bash, system bash, cmd.exe fallbacks

### pack.ps1 — Icon path fix
- Updated icon source from `novi_logo.png` to `icon.png`

## Files Changed
- `buildit.sh`
- `package.json`
- `pack.ps1`
- `src/main/main.ts`
- `src/main/services/terminal-service.ts`
- `src/renderer/assets/icon.png`
- `src/tests/core-0.4.0/terminal-service.test.ts`

## Test Results
- 30 suites passed, 1 failed (pre-existing extension-loader — missing Lyric extension on this machine)
- 589 passed, 2 failed (pre-existing)

## Commit Hash
TBD
