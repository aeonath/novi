# Ad hoc — Bump version to 0.6.9; Help and Novi Shell show package.json version — 20260213.2139

## Summary
Version bumped to **0.6.9** in package.json. Help > About Novi and Novi Shell (welcome line and `version` command) now display the version from package.json via the existing `getVersion()` IPC so they stay in sync with package.json.

## Reason
User requested: bump version to 0.6.9, commit, write changelog; ensure the version in the help menu and Novi Shell match and reflect package.json.

## Files Changed

### Created
- **nova/changelog/20260213/TIME_2139-CHANGELOG.md** — This file.

### Modified
- **package.json**
  - `"version": "0.6.6-dev"` → `"version": "0.6.9"`.
- **src/renderer/components/App.tsx**
  - Added `appVersion` state (default `'0.6.9'`). On mount, `window.api.getVersion()` is called and the result is stored in `appVersion`.
  - Help > About Novi popup shows `Version {appVersion}` instead of hardcoded `0.6.6-dev`.
- **src/renderer/components/NoviShell.tsx**
  - Added `appVersionRef` (default `'0.6.9'`). Init effect runs an async that awaits `window.api.getVersion()`, stores the value in the ref, then creates the terminal and writes the welcome line as `Novi Shell v${v}`.
  - `commandVersion` (the `version` command) writes `Novi Editor v${appVersionRef.current}` so it matches the same source.

## Implementation details
- Electron’s `app.getVersion()` returns the version from the app’s package.json, so changing package.json is the single source of truth.
- NoviShell init is wrapped in an async IIFE so we can await `getVersion()` before creating the terminal and writing the welcome; cleanup sets a `cancelled` flag so we don’t touch refs after unmount.

## User-facing impact
- App version is 0.6.9. Help > About and Novi Shell (welcome + `version` command) all show 0.6.9 and will track future package.json version bumps.

## Git Commit Hash
`2dffe7d` — Bump version to 0.6.9; Help and Novi Shell use getVersion() from package.json

## Status
✅ Completed
