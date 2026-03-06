# Changelog — 2026-03-05 22:06

## Sprint 7 Task 10: Command Palette on editor tabs

### Summary
Enabled the Command Palette on editor tabs. Uses Monaco's built-in `editor.action.quickCommand` which provides a searchable list of all editor commands. The palette is available via Ctrl+P and the Novi menu when on a file editor tab. It remains grayed out on terminal tabs, the home terminal, and the Novi Shell.

### Implementation

#### MonacoEditor.ts
- Added `openCommandPalette` to the exposed `__monacoEditorAPI`
- Triggers `editor.action.quickCommand` on the Monaco editor instance

#### App.ts
- `command-palette` menu command handler now calls `openCommandPalette()` when the active tab is a file
- Added Ctrl+P keyboard shortcut in `setupKeyboardShortcuts()` — only triggers on file tabs

#### TitleBar.ts
- Removed static `disabled: true` from the Command Palette menu item
- Added `EDITOR_ONLY_COMMANDS` list (contains `command-palette`)
- Command Palette dynamically grayed out on terminal and Novi Shell tabs (same pattern as Save/Save As)

#### menu.ts (Electron)
- Enabled the Command Palette menu item (removed `enabled: false`)
- Fixed accelerator from `CmdOrCtrl+Shift+P` to `CmdOrCtrl+P`

### Files Changed
- **`src/renderer/components/MonacoEditor.ts`** — Added `openCommandPalette` API
- **`src/renderer/components/App.ts`** — Handle `command-palette` command, Ctrl+P shortcut
- **`src/renderer/components/TitleBar.ts`** — Dynamic disable for command palette on non-file tabs
- **`src/main/menu.ts`** — Enabled command palette, fixed accelerator

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
