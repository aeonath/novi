# Fix — 20251103.0048

## Summary
Fixed file locking issue in packaging by adding clean step before build. Files from previous builds were being locked by Windows, causing electron-builder to fail.

## Files Changed
- package.json — Added `npm run clean` before build in pack:win scripts
- pack.ps1 — Added clean step before build

## Reason
Electron-builder was failing with "file is being used by another process" error. This happens when previous build artifacts are still locked. Adding a clean step ensures old files are removed before building.

## Git Commit Hash
`TBD` - Fix file locking in packaging

**NOTE**: Use `TBD` as placeholder - commit hash will be updated later

## Status
✅ Completed

## Instructions
If you still get file locking errors:
1. Close any file explorer windows viewing the `dist/` folder
2. Make sure no previous Nova.exe processes are running
3. Try: `npm run clean` then `npm run pack:win`

