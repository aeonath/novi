# Ad hoc — Changelog + commit standard and session fixes — 20260213.1352

## Summary
1. **CLAUDE_CONFIG.md**: Documented standard for ad hoc (non-sprint) work: always create a changelog and git commit after each modification; no Sprint Task Summary required.
2. **Session fixes** (from this conversation): vim insert cursor matched to Terminal window (underline, no blink); file tree flicker and ".." navigation fixes; workspace restore shows active file tab in editor; drive root (C:\) handling to avoid EPERM and watcher errors.

## Files Changed

### Modified
- **nova/ai/CLAUDE_CONFIG.md** — Added "STANDARD FOR AD HOC MODIFICATIONS (NON-SPRINT WORK)": changelog + commit after each modification; no Sprint Task Summary for ad hoc. Clarified Sprint Task Summary is only for SPRINT_PLAN tasks.
- **src/renderer/vim/cm_adapter.ts** — leaveVimMode: use Terminal-window cursor (underline, solid blink, width 2). enterVimMode/leaveVimMode cursor logic restored earlier in session.
- **src/renderer/components/FileTree.tsx** — driveFileWatcher prop; only primary tree registers __fileTreeAPI; ".." click: full reinit (setTree([]), setExpandedDirs(new Set()), setRootPath, loadDirectory); skip file tree watch when rootPath is drive root (C:\, D:\).
- **src/renderer/components/App.tsx** — onDirectoryOpen: removed fileTreeAPI.loadDirectory call (avoid loop). Workspace save: activeFileIndex. Restore: when activeFileIndex valid, setShowWelcome(false), setActiveTab, loadFile into Monaco; else showWelcome true. Sync "Restore active tab" only for non-file types.
- **src/renderer/components/WorkspaceSplit.tsx** — FileTree driveFileWatcher={false}.
- **src/renderer/components/GitPanel.tsx** — Skip gitStartWatching when workspaceRoot is drive root.
- **src/main/main.ts** — read-directory: skip Windows system names at drive root; per-entry stat try/catch; filter nulls. git-start-watching: return early when repoPath is drive root.
- **src/main/services/file-tree-watcher.ts** — watch(): return without starting when dirPath is drive root.
- **src/main/services/git-watcher.ts** — unwatch(): capture watcher ref before await to fix null "close" error.

## Reason
- Config: User requested that git commit and changelog be the standard after each modification when not working on a SPRINT_PLAN Task.
- Vim: Insert mode cursor should match Terminal window (underline, no blink).
- File tree: Stop flicker when switching directories; ".." should fully reinit like Open Folder; avoid watching drive root (EPERM).
- Workspace: Restored session should show the active file tab content in the editor.
- Drive root: Listing C:\ and not watching it avoids EPERM on system paths and git/filertree watcher errors.

## Git Commit Hash
`TBD` — Ad hoc: config standard + session fixes

## Status
✅ Completed
