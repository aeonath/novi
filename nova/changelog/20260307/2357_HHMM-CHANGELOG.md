# Changelog — 20260307.2357

## Ad hoc: Fix app icon not displaying on Debian/GNOME

### Problem
The app icon was not appearing in the GNOME taskbar/dock or window title after installing the .deb package on Debian Linux.

### Root Causes
1. `linux.icon` in package.json pointed to a single PNG (`build/icon.png`) instead of the `build/icons` directory containing sized PNGs — electron-builder couldn't install icons to `/usr/share/icons/hicolor/<size>/apps/`
2. No `executableName` set — potential WM class mismatch between `productName` ("Novi") and expected lowercase name
3. No `StartupWMClass` in .desktop file — GNOME couldn't associate the running window with its .desktop entry and icon
4. Icon generation used ImageMagick (`convert`) which may not be installed — switched to `sharp` (already a devDependency)

### Changes

| File | Change |
|------|--------|
| `package.json` | Changed `linux.icon` from `"build/icon.png"` to `"build/icons"` (directory of sized PNGs); added `executableName: "novi"`; added `desktop.StartupWMClass: "novi"` |
| `scripts/copy-icons.js` | Replaced ImageMagick `convert` with `sharp` for generating Linux icon sizes |

### .deb Package Verification
- All 7 icon sizes (16–512px) install to `/usr/share/icons/hicolor/<size>/apps/novi.png`
- `.desktop` file includes `Icon=novi` and `StartupWMClass=novi`

### Test Results
- 37 passed, 2 failed (pre-existing: `installer.test.ts` missing `build/installer.nsh`, `extension-loader.test.ts` missing `~/.nova/extensions`)
- No new failures introduced

### Commit
`TBD`
