# Ad hoc — Status bar path from file tree; terminal initial CWD — 20260213.1543

## Summary
1. **Status bar path**: Drive the status bar’s left-side path from the file tree’s actual root via an `onRootChange` callback so the path always matches what the file tree shows (and is empty after reset).
2. **Terminal CWD when switching tabs**: Send the initial CWD when the PTY is created so the file tree can show that terminal’s directory as soon as you switch to its tab, before the shell sends PWD.

## Files Changed

### Modified
- **src/renderer/components/FileTree.tsx** — Added optional prop `onRootChange?: (path: string | null) => void`. Effect calls `onRootChange(rootPath)` whenever `rootPath` changes. On reset, call `onRootChange(null)`. Ref used to avoid stale callback.
- **src/renderer/components/App.tsx** — State `fileTreeReportedRoot` updated by `onRootChange={setFileTreeReportedRoot}` on FileTree. StatusBar receives `fileTreePath={fileTreeReportedRoot}`. In reset-workspace handler: `setFileTreeReportedRoot(null)`. Added effect for `terminalOnInitialCwd`: on `terminal-initial-cwd` (terminalId, cwd) update `terminalFileTreeRoots[terminalId].cwd` so the file tree has a path when switching to that terminal tab.
- **src/main/main.ts** — In `terminal-create` handler: compute `cwdPath = cwd || process.cwd()`, then after creating the session send `terminal-initial-cwd` (terminalId, cwdPath) to the renderer. Return `{ id: terminalId, initialCwd: cwdPath }`.
- **src/preload/preload.ts** — `terminalOnInitialCwd(callback)` and `terminalRemoveInitialCwdListener()` for the `terminal-initial-cwd` IPC.
- **src/types/global.d.ts** — Declared `terminalOnInitialCwd` and `terminalRemoveInitialCwdListener` on the window API.

## Reason
- User reported the directory was not shown in the status bar bottom-left; the path was tied to `currentFileTreeDisplayRoot`, which could be null. Using the file tree’s reported root ensures the status bar shows whatever the file tree is displaying.
- User reported that after app open, switching to a terminal tab did not show the terminal’s CWD in the file tree. CWD was only set when the shell sent PWD. Sending the initial CWD when the PTY is created gives the file tree a path immediately when switching to that tab.

## Git Commit Hash
`TBD` — Ad hoc: status bar path from file tree, terminal initial CWD

## Status
✅ Completed
