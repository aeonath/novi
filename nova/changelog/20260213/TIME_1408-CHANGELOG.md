# Sprint 6 Task 7 — Separate file tree view for Terminal Tabs — 20260213.1408

## Summary
Implemented per-terminal and per-editor-tab file tree views. The file tree now tracks the active tab: when a terminal tab is active it shows that terminal’s CWD (or an overridden folder from Open Folder); when a file/image tab is active it shows the tree root associated with that tab (where the file was opened from). A Novi Shell setting `set singlefiletree on|off` (default off) toggles between this behavior and the legacy single file tree for all tabs.

## Requirements (from SPRINT6_PLAN.md Task 7)
- File tree tracks the CWD of the terminal and displays the terminal’s current working directory when that terminal tab is active.
- If a file is clicked in that file tree, that file tree view becomes associated with that editor tab.
- Multiple editor tabs can have different file tree views based on where the file was opened.
- New terminal shows its CWD in the file tree when its tab is active; switching back to another terminal shows that terminal’s CWD.
- Open Folder at the top overrides the terminal’s CWD for that terminal (or sets the file tab’s tree root, or the global workspace root when no terminal/file tab is active).
- Feature can be disabled with Novi Shell: `set singlefiletree on` uses a single file tree for all (current legacy behavior). Default is off (separate trees).

## Files Changed

### Modified
- **src/main/main.ts** — Terminal PWD: send full path to renderer instead of last segment only. `mainWindowRef.webContents.send('terminal-pwd', terminalId, pwd)` so the renderer can use the path for the file tree and derive the tab title.
- **src/renderer/components/App.tsx** — State: `singleFileTree` (loaded from setting `singlefiletree`, default false), `terminalFileTreeRoots` (per-terminal `{ cwd, overriddenRoot? }`), `fileTabToTreeRoot` (tabId → root path). Effect: load `singlefiletree` on mount; subscribe to `novi-singlefiletree-changed`. Terminal PWD listener: update `terminalFileTreeRoots[id].cwd` with full path; derive dirName for tab title from path segments. New terminal / restore: initialize `terminalFileTreeRoots[id]` with initial cwd. `currentFileTreeDisplayRoot` useMemo: when singleFileTree or no workspaceRoot use workspaceRoot; when terminal tab use that terminal’s overriddenRoot ?? cwd ?? workspaceRoot; when file/image tab use fileTabToTreeRoot[tabId] ?? workspaceRoot; else workspaceRoot. FileTree: pass `displayRoot={currentFileTreeDisplayRoot}`. onDirectoryOpen: if singleFileTree set workspaceRoot and run git; if terminal tab set overriddenRoot for that terminal; if file/image tab set fileTabToTreeRoot[tabId]; else set workspaceRoot; run git when setting main workspace. onFileOpen (from tree): when adding file or image tab, set fileTabToTreeRoot[tabId] = currentFileTreeDisplayRoot. onTabClose: remove terminal from terminalFileTreeRoots; remove file/image tab from fileTabToTreeRoot.
- **src/renderer/components/FileTree.tsx** — New prop `displayRoot?: string | null`. When `displayRoot` is set and differs from internal `rootPath`, sync: setRootPath(displayRoot) and loadDirectory(displayRoot). Initial load: only use `initialPath` when `displayRoot` is not provided.
- **src/renderer/components/NoviShell.tsx** — `set` command: add option `singlefiletree`. Show in “Current settings” and “set with no args”; get/set via getSetting/setSetting (default false). On set, dispatch `novi-singlefiletree-changed` so App updates. Help text: “Supported: vimode, compat, singlefiletree”.
- **src/tests/core-0.6.0/vimode-setting.test.ts** — New describe “singlefiletree setting (Sprint 6 Task 7)”: default false when unset; round-trip persist on/off.

## Implementation details
- CWD for terminals comes from the existing PROMPT_COMMAND `echo "__NOVA_PWD__:$(pwd)"`; main already stripped this from output and sent a PWD update. The only change was sending the full path instead of the last segment so the file tree can display that directory.
- When singlefiletree is true, behavior matches the previous app: one workspace root, one file tree. When false, the displayed root is derived from the active tab and the per-terminal / per-file-tab state.
- Git panel and workspace save continue to use the main `workspaceRoot` for the primary workspace; they are not switched per tab.

## Test results
- `npm test`: 29 suites passed (584 tests). New tests in core-0.6.0/vimode-setting.test.ts for singlefiletree pass. One pre-existing failure: core-0.1.0/settings.test.ts EPERM on unlink (unrelated to this task).

## Git Commit Hash
`TBD` — Sprint6 Task7: Separate file tree view for terminal tabs

## Status
✅ Completed
