# Changelog — 2026-03-07 23:38

## Ad hoc: Fix app icon not displaying in packaged Linux .deb

### Problem
The BrowserWindow icon path `join(__dirname, '../../build/icon.png')` works in
development but fails in a packaged Electron app. In the .deb package,
`__dirname` resolves inside the app.asar archive, and the `build/` directory
is not bundled — it's only used as build resources by electron-builder.

### Changes
| File | Change |
|------|--------|
| `src/main/main.ts` | Changed icon path from `../../build/icon.png` to `../renderer/assets/icon.png` — points to the assets directory that is already bundled into `dist/` |
| `package.json` | Added `icon.png` to the `copy:renderer` script so it's copied to `dist/renderer/assets/` during build |

### Rationale
The `dist/renderer/assets/` directory is already included in the packaged app
via the `files: ["dist/**"]` config. By referencing the icon from there instead
of the unbundled `build/` directory, the icon resolves correctly in both
development and production (packaged .deb).

### Test Results
- 641 passed, 5 failed (pre-existing: installer.nsh missing on Linux,
  Lyric extension not installed, settings vimode default)
- TypeScript compilation: clean

### Commit
`TBD`
