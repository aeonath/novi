# Changelog — 2026-03-05 20:43

## Fix: Prevent stale file tree flash during terminal initialization

### Summary
When `singlefiletree` is off (multi-tree mode), the file tree was briefly showing the saved workspace root from the previous session before switching to the terminal's actual CWD. Now the file tree stays in loading state until the terminal reports its CWD — no stale tree is shown.

### Root Cause
Two paths were loading the saved workspace root into the file tree during startup:
1. Workspace restore called `ftApi.loadDirectory(workspace.workspaceRoot)` regardless of the singlefiletree setting
2. `updateFileTreeDisplayRoot()` would fall through to `this.workspaceRoot` as a fallback and set `displayRoot`, triggering a directory load

### Fix
- Workspace restore (`loadWorkspace`) now only loads the saved root into the file tree when `singlefiletree` is on. In multi-tree mode, the tree stays in loading state.
- `updateFileTreeDisplayRoot()` now checks `this.fileTree.isLoading` — while loading, it skips setting `displayRoot` to avoid loading a stale fallback path.
- Added `isLoading` getter to `FileTree` so `App.ts` can check the loading state.
- Loading clears when the terminal reports its CWD (via `terminalOnInitialCwd` or `terminalOnPwd`), at which point `updateFileTreeDisplayRoot()` runs and correctly sets the terminal's CWD as the file tree root.

### Files Changed
- **`src/renderer/components/FileTree.ts`** — Added `isLoading` public getter
- **`src/renderer/components/App.ts`** — Guard `updateFileTreeDisplayRoot()` with `isLoading` check; skip workspace root restoration to file tree when `singlefiletree` is off

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
