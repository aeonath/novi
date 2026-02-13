# Ad hoc — Status bar path, terminal tab green, reset Ready, file tree path fix — 20260213.1535

## Summary
1. **Status bar**: Show absolute file tree path on the left; clear when workspace is reset. Reset workspace sets status bar text to "Ready".
2. **Terminal tab UX**: Active terminal tab label and file tree header (root directory name) use green when the file tree is tied to that terminal.
3. **File tree (terminal CWD)**: Normalize Git Bash Unix-style paths in read-directory so the terminal file tree shows all entries instead of one.

## Files Changed

### Modified
- **src/main/main.ts** — In `read-directory` handler: normalize Git Bash/Unix-style paths (`/c/Work`, `/d/...`) to Windows form (`C:\Work`, `D:\...`) before calling `readdir`, so the file tree shows the full directory listing when the terminal CWD is sent as `/c/...`.
- **src/renderer/components/StatusBar.tsx** — New prop `fileTreePath?: string | null`. When set, render the absolute path on the left of the status bar (ellipsis, max-width, tooltip with full path). When empty (e.g. after reset workspace), show nothing. Added `StatusBarProps` and `pathItem` style.
- **src/renderer/components/App.tsx** — Pass `fileTreePath={currentFileTreeDisplayRoot}` to `StatusBar` so the path updates when switching tabs. In `reset-workspace` case: call `__statusBarAPI.setStatus('Ready')` after reset. Pass `isTerminalTree={!singleFileTree && activeTab?.type === 'terminal'}` to `FileTree`.
- **src/renderer/components/FileTree.tsx** — New prop `isTerminalTree?: boolean`. When true, style the header title (root directory name) with color `#4ec9b0` so it matches the terminal tab and indicates the tree is tied to that terminal.
- **src/renderer/components/TabBar.tsx** — When the active tab is a terminal, style the tab label with color `#4ec9b0` (green) so it’s visually tied to the file tree header.

## Reason
- User requested: status bar left = file tree absolute path; reset workspace → status "Ready" and path empty; path updates when changing tabs.
- User requested: terminal tab and file tree root name in green when the file tree is tied to the open terminal.
- Bug fix: terminal file tree showed only one directory because Git Bash sends PWD as `/c/Work`; Node `readdir` needed a normalized Windows path.

## Git Commit Hash
`TBD` — Ad hoc: status bar path, terminal green, reset Ready, file tree path fix

## Status
✅ Completed
