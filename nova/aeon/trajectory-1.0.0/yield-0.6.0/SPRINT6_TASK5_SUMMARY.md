# Sprint 6 Task 5 — Cleanup Tasks Part 2

## Objective
Complete the eight cleanup items listed in SPRINT6_PLAN.md Task 5.

## Completed Items

### 1. File→Close menu
- **Issue**: File→Close did nothing.
- **Fix**: Implemented `onCloseFile` in App actionContext: get active tab via `__tabBarAPI.getActiveTab()`, if it is a file tab call `tabBarAPI.removeTab(tab.id)`. Same save-prompt and close behavior as the tab close button.

### 2. Monaco syntax highlighting by file extension
- **Requirement**: Highlight by extension (e.g. .py → Python); default for many common types (.php, .c, .sh, etc.).
- **Status**: Already in place. `detectLanguage(filePath)` in MonacoEditor maps extensions to Monaco language ids (python, php, c, shell, typescript, javascript, etc.). loadFile uses it. No code change.

### 3. Vim ex command box colors
- **Issue**: The `:` ex command input was white with black text.
- **Fix**: Added CSS in index.html for `.novi-vim-statusbar input`: dark background (#252526), light text (#cccccc), border (#3e3e42). MonacoEditor vim status bar div has `className="novi-vim-statusbar"` so the ex input inherits the theme.

### 4. File icon in tab
- **Requirement**: Show the same file icon as in the file tree next to the file name in the tab.
- **Fix**: In TabBar, added `getFileIcon(fileName)` (same mapping as FileTree: 📜 ts/js/jsx/tsx, 📋 json, 📝 md, 🌐 html, 🎨 css, 🖼️ images, 📄 default). File tabs now display `{icon} {fileName}`; terminal and Novi Shell tabs already include their icon in fileName.

### 5. Version 0.6.0-dev
- **Fix**: Set `version` to `0.6.0-dev` in package.json and package-lock.json.

### 6. Novi Shell version
- **Fix**: Welcome line and `version` command now show "Novi Editor v0.6.0-dev" / "Novi Shell v0.6.0-dev". Removed obsolete "Integration Layer - Sprint 4" and "Build: Sprint4-Task6" lines.

### 7. compat setting in Novi Shell
- **Requirement**: Add `compat` setting, default off; `set` with no arguments shows all current settings.
- **Fix**: `set` with no args: reads and prints `vimode` and `compat`. `set compat on` / `set compat off`: persists and prints confirmation. Default for `compat` is false. Will be used in a later task for non-standard vi command mappings.

### 8. Dirty dot on tab in vimode
- **Issue**: Dirty indicator (●) sometimes did not show or clear correctly.
- **Fix**: TabBar’s `updateTabDirty(tabId, isDirty)` expects a tab id. Several call sites were passing `filePath` instead of `tab.id`. Updated: onSaveFile uses getActiveTab() and updateTabDirty(tab.id, false); file-reload uses matchingTab.id. Content changes already trigger onDidChangeModelContent and updateTabDirty(activeTab.id, isDirty); no change there.

## References
- **SPRINT6_PLAN.md** — Task 5 list.
- **Changelog**: `nova/changelog/20260212/TIME_2323-CHANGELOG.md`.
