# Changelog — 20260308.1941

## Ad hoc: Fix file tree watcher never watching the active directory

### Problem
The file tree watcher (chokidar) was effectively dead. It was never watching the right directory because:

1. On mount, `setupFileWatcher()` was called but `rootPath` was still null → early return, no watcher started
2. When terminal CWD changed, the `displayRoot` setter loaded the new directory but never called `setupFileWatcher()`
3. The watcher sat idle watching nothing while the file tree showed real directories

This is why `touch newfile.txt` never showed new files in the tree, and `rm file.txt` never removed them.

### Root Cause
The `displayRoot` setter (the PRIMARY code path used when terminal CWD drives the file tree) was the only root-change path that didn't restart the watcher. It loaded the directory contents but left chokidar watching whatever it was watching before (which was nothing).

### Fix
- **`displayRoot` setter**: Added `this.expandedDirs.clear()` (stale paths from old root) and `this.setupFileWatcher()` to restart chokidar for the new root
- **`loadDirectoryProgrammatically()`**: Added `this.expandedDirs.clear()` for consistency

### Files Changed
- `src/renderer/components/FileTree.ts`

### Test Results
- 39 suites, 646 tests — all passing
- Build compiles successfully

### Commit
TBD
