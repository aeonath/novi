# Changelog — 2026-03-05 20:48

## Fix file tree loading flash and change active terminal tab to bold white

### Summary
Two fixes:
1. The file tree loading spinner was being cleared too early by `terminalOnInitialCwd`, which just echoes back the saved workspace CWD (not the shell's actual CWD). This caused a flash: spinner -> stale directory -> actual directory. Now loading is only cleared by `terminalOnPwd` (OSC 7), which reports the shell's real working directory.
2. Active terminal tab heading changed from green (#4ec9b0) to bold white (#ffffff, font-weight: bold).

### Root Cause (File Tree Flash)
`terminalOnInitialCwd` fires with the CWD that was saved in the workspace (e.g., `C:\Work\novi`). The handler was clearing `fileTree.loading = false` and calling `updateFileTreeDisplayRoot()`, which loaded the stale directory into the tree. Later, `terminalOnPwd` fired with the actual shell CWD (`C:\Work`), causing a visible directory change.

### Fix
- Removed `this.fileTree.loading = false` from the `terminalOnInitialCwd` handler in App.ts
- Loading is now only cleared in the `terminalOnPwd` handler (which has the real shell CWD) and in `loadSettings` (when singlefiletree is on)
- The `updateFileTreeDisplayRoot` guard (`!this.fileTree.isLoading`) prevents the stale directory from being set while loading is active

### Files Changed
- **`src/renderer/components/App.ts`** — Removed `this.fileTree.loading = false` from `terminalOnInitialCwd` handler
- **`src/renderer/components/TabBar.ts`** — Changed active terminal tab style from `color: #4ec9b0` to `color: #ffffff; font-weight: bold`

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
