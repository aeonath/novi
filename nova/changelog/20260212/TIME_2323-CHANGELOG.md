# Sprint6 Task5 — Cleanup Tasks Part 2 — 20260212.2323

## Summary
Implemented all eight Sprint 6 Task 5 cleanup items: File→Close now closes the active file tab; Monaco syntax highlighting by extension already in place for common types; vim ex command input styled to match editor dark theme; file-type icon shown in tab next to file name; package version set to 0.6.0-dev; Novi Shell version and version command updated to 0.6.0-dev; compat setting added to Novi Shell (default off), set with no args shows all settings; tab dirty indicator fixed by using tab id consistently for updateTabDirty.

## Files Changed

### Modified
- **package.json** — version `0.5.1` → `0.6.0-dev`.
- **package-lock.json** — version `0.5.1` → `0.6.0-dev` (root and packages."").
- **src/renderer/components/App.tsx** — Added `onCloseFile` to actionContext: gets active tab via tabBarAPI.getActiveTab(), if type === 'file' calls tabBarAPI.removeTab(tab.id). Fixed updateTabDirty to use tab id: in onSaveFile use getActiveTab() and updateTabDirty(tab.id, false); in file-reload flow use matchingTab.id instead of filePath.
- **src/renderer/components/MonacoEditor.tsx** — vim status bar div given `className="novi-vim-statusbar"` for ex input styling.
- **src/renderer/index.html** — CSS for `.novi-vim-statusbar input` (background #252526, color #cccccc, border #3e3e42, font, padding) and placeholder color so vim ex box matches editor theme.
- **src/renderer/components/TabBar.tsx** — Added `getFileIcon(fileName)` (same mapping as FileTree: 📜 ts/js, 📋 json, 📝 md, 🌐 html, 🎨 css, 🖼️ images, 📄 default). File tabs now display `{icon} {fileName}`; terminal/novi-prompt keep existing fileName (already include icon).
- **src/renderer/components/NoviShell.tsx** — Welcome "Novi Shell v0.6.0-dev"; commandVersion "Novi Editor v0.6.0-dev". Set command: when args.length === 0 show all current settings (vimode, compat). Added compat option (get/set, default false). Supported options: vimode, compat. Help text for set updated.
- **src/tests/core-0.6.0/vimode-setting.test.ts** — New describe "compat setting": default false when unset, persist on/off.

## Technical Details

1. **File→Close** — actionContext.onCloseFile uses __tabBarAPI.getActiveTab(); if tab.type === 'file' calls removeTab(tab.id), which runs the same save-prompt and close flow as the tab X button.
2. **Syntax highlighting** — Already implemented: detectLanguage() in MonacoEditor maps extensions (py, php, c, sh, ts, js, etc.) to Monaco language ids; loadFile uses it. No code change; confirmed as default for common types.
3. **Vim ex box** — monaco-vim renders an input inside the status bar node. Added .novi-vim-statusbar in MonacoEditor and global CSS in index.html for input (dark background, light text, border) to match editor.
4. **File icon in tab** — getFileIcon() in TabBar matches FileTree (by extension). File tabs show icon + space + fileName; other tab types unchanged.
5. **Version 0.6.0-dev** — package.json and package-lock.json.
6. **Novi Shell version** — Welcome line and version command show "v0.6.0-dev"; removed obsolete Sprint 4 / Build lines.
7. **compat setting** — Key `compat` (boolean), default false. set with no args: getSetting('vimode', true), getSetting('compat', false), print both. set compat on/off: setSetting('compat', value), confirm message. For future task: compat will drive non-standard vi command mappings.
8. **Dirty dot in vimode** — updateTabDirty was sometimes called with filePath instead of tab id; TabBar expects tab id. Fixed onSaveFile and file-reload to use getActiveTab()/matchingTab.id so the correct tab’s dirty state is cleared. Content changes already notify via onDidChangeModelContent; no change needed there.

## Reason
Sprint 6 Task 5: Cleanup Tasks Part 2 per SPRINT6_PLAN.md.

## Test Results
- `npm run build`: success.
- `npm test`: 30 suites, 582 tests passed (including 2 new compat tests).

## Git Commit Hash
`TBD` — Sprint6 Task5 Cleanup Part 2

## Status
✅ Completed
