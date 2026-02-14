# Sprint 6 Task 9 — Cleanup Tasks final sprint tasks — 20260213.2102

## Summary
Implemented all nine sub-tasks of Sprint 6 Task 9: (1) exit command in Novi Shell to close the tab; (2) terminal auto-copy of highlighted text to clipboard; (3) vim ex commands :q, :q!, :wq; (4) vimode default off; (5) home button on status bar to show home screen; (6) Novi Shell right-click context menu fix; (7) status bar line/column/total lines; (8) :ex box font size 14px; (9) View menu Increase/Decrease/Reset Font Size for editor and terminal, grayed out on Novi Shell.

## Reason
SPRINT6_PLAN.md Task 9 — final cleanup before release.

## Files Changed

### Modified
- **src/renderer/components/NoviShell.tsx**
  - Added `exit` command: calls `onClose?.()` to close the tab. Documented in help.
  - Changed all `getSetting('vimode', true)` to `getSetting('vimode', false)` so vimode defaults to off.
  - Added `onContextMenu={handleContextMenu}` on the outer container so context menu shows even if inner terminal swallows events.
- **src/renderer/components/App.tsx**
  - State: `editorFontSize`, `terminalFontSize` (default 14); load from settings on mount (`fontSize`, `terminalFontSize`).
  - `forceCloseTabIdRef`: when set, `onTabClose` returns true immediately for that tab (vim :q!).
  - `useEffect` registering `window.__noviVimQuit(force)`: closes active file tab; if `force` true, sets `forceCloseTabIdRef` so no save prompt.
  - `handleMenuCommand`: `increase-font-size` / `decrease-font-size` / `reset-font-size` — when active tab is file, update `editorFontSize` and `setSetting('fontSize')`; when terminal, update `terminalFontSize` and `setSetting('terminalFontSize')`; no-op when Novi Shell.
  - Pass `editorFontSize` to `MonacoEditor`, `terminalFontSize` to `Terminal`, `onHomeClick={() => setShowWelcome(true)}` to `StatusBar`, `activeTabType={activeTab?.type}` to `TitleBar`.
- **src/renderer/components/StatusBar.tsx**
  - New prop `onHomeClick?: () => void`. When set, render a home button (⌂) on the far right; click calls `onHomeClick`. Styles: `homeButton`.
- **src/renderer/components/MonacoEditor.tsx**
  - Subscribe to `onDidChangeCursorPosition` and update `__statusBarAPI.addItem('editor-position', { text: 'Ln X, Col Y (Z lines)', section: 'right' })`. Clear on dispose with `removeItem('editor-position')`.
  - Pass through `fontSize` prop (already supported).
- **src/renderer/components/TitleBar.tsx**
  - New prop `activeTabType?: string | null`. When `activeTabType === 'novi-prompt'`, treat Increase/Decrease/Reset Font Size as disabled in `renderMenuItem`.
- **src/renderer/components/Terminal.tsx**
  - New prop `fontSize?: number` (default 14). Used in temp terminal and main xterm creation; `useEffect` when `fontSizeProp` changes updates `terminal.options.fontSize` and calls `fitAddon.fit()` and `onResize`.
  - Auto-copy: `terminal.onSelectionChange` (if present) copies selection to clipboard via `window.api.clipboardWriteText`.
- **src/renderer/vim/cm/keymap_vim.ts**
  - `defaultExCommandMap`: added `{ name: 'quit', shortName: 'q' }`, `{ name: 'wq', shortName: 'x' }`.
  - `exCommands.quit`: if `params.argString` contains `!`, call `__noviVimQuit(true)` (force); else `__noviVimQuit(false)`.
  - `exCommands.wq`: call `CodeMirror.commands.save(cm)` (or `cm.save()`), then after 200ms call `__noviVimQuit(false)`.
- **src/renderer/index.html**
  - `.novi-vim-statusbar input` font-size changed from 12px to 14px to match editor font.

## Implementation details
- **:q / :q!** — App registers `__noviVimQuit(force)`. Vim quit command calls it; `force` from `:q!` skips save prompt via `forceCloseTabIdRef`.
- **:wq** — Runs save then quit after short delay so async save can complete.
- **Status bar position** — Monaco reports cursor and line count; item id `editor-position` so it can be removed on editor dispose.
- **Font size** — Editor uses existing `fontSize` setting and prop; new `terminalFontSize` setting and Terminal prop; View menu handlers update state and settings; Novi Shell tab disables those menu items.

## User-facing impact
- Novi Shell: `exit` closes the tab; vimode defaults to off; right-click shows Copy/Paste/Close.
- Terminal: selecting text copies to clipboard; View > font size changes terminal font.
- Editor: status bar shows Ln/Col/lines; View > font size changes editor font; vim :q / :q! / :wq close the file tab.
- Status bar: home button (⌂) shows welcome screen without closing tabs.
- :ex input font size 14px.

## Test results
- `npm test`: 31 suites, 590 tests passed.

## Git Commit Hash
`TBD` — Sprint6 Task9: Cleanup tasks final

## Status
✅ Completed
