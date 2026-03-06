# Changelog — 2026-03-05 21:08

## Fix EACCES crashes when watchers hit Windows AppX symlinks

### Summary
Navigating to large directories (e.g. `AppData/Local`) caused unhandled EACCES errors from chokidar watchers trying to stat Windows AppX symlinks (like `python3.exe`, `ms-teams.exe` in `WindowsApps`). These crashed the main process and made the UI unresponsive.

### Root Cause
Two issues:
1. **GitWatcher** was missing `ignorePermissionErrors: true` in its chokidar config, so EACCES errors from `stat()` on Windows UWP app symlinks were not silently skipped.
2. **Both watchers** (FileTreeWatcher and GitWatcher) re-emit errors via `this.emit('error', error)` on their EventEmitter, but main.ts never registered `'error'` listeners on these instances. Node's EventEmitter throws unhandled `'error'` events as exceptions, which bubbled up as unhandled rejections and triggered crash reports.

### Fix
- Added `ignorePermissionErrors: true` to GitWatcher's chokidar config (FileTreeWatcher already had it)
- Registered `'error'` event listeners on both `fileTreeWatcher` and `gitWatcher` in main.ts to absorb errors gracefully via `logError()`

### Files Changed
- **`src/main/services/git-watcher.ts`** — Added `ignorePermissionErrors: true` to chokidar watch options
- **`src/main/main.ts`** — Added error listeners for `fileTreeWatcher` and `gitWatcher`

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
