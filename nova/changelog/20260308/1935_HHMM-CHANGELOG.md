# Changelog — 20260308.1935

## Ad hoc: Fix file tree not updating when files are removed

### Problem
When the file tree root changed (terminal CWD change or manual folder open), the chokidar file watcher was never restarted for the new directory. It kept watching the old root, so file additions and removals in the current directory were not detected.

`setupFileWatcher()` was only called:
1. Once at initial mount
2. When toggling (expanding/collapsing) directories

But NOT when the root changed via `loadDirectoryProgrammatically()` or `openDirectory()`.

### Fix
Added `this.setupFileWatcher()` call after loading the new directory in both:
- `loadDirectoryProgrammatically()` — called when terminal CWD changes the file tree root
- `openDirectory()` — called when user manually opens a folder

`setupFileWatcher()` already handles stopping the old watcher and starting a new one for the current root + expanded paths.

### Files Changed
- `src/renderer/components/FileTree.ts`

### Test Results
- 39 suites, 646 tests — all passing
- Build compiles successfully

### Commit
TBD
