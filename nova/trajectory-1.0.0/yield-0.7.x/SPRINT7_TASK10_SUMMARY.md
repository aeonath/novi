# Sprint 7 — Task 10 Summary

## Command Palette on Editor Tabs

### Objective
Enable the Command Palette on editor tabs via Ctrl+P and the Novi menu. Keep it grayed out / inactive on terminal tabs, home terminal, and Novi Shell.

### Checklist
- [x] Add `openCommandPalette` to Monaco editor API (triggers `editor.action.quickCommand`)
- [x] Handle `command-palette` command in App.ts (file tab only)
- [x] Add Ctrl+P keyboard shortcut (file tab only)
- [x] Remove static `disabled: true` from TitleBar menu item
- [x] Dynamically gray out Command Palette on terminal/novi-prompt tabs
- [x] Enable in Electron menu with correct Ctrl+P accelerator
- [x] All tests pass (36 suites, 654 tests)
- [x] Build succeeds

### Files Changed
| File | Change |
|------|--------|
| `src/renderer/components/MonacoEditor.ts` | Added `openCommandPalette` to exposed API |
| `src/renderer/components/App.ts` | Command palette handler + Ctrl+P shortcut |
| `src/renderer/components/TitleBar.ts` | Dynamic disable for non-file tabs |
| `src/main/menu.ts` | Enabled menu item, fixed accelerator |

### Approach
Used Monaco's built-in command palette (`editor.action.quickCommand`) rather than building a custom one. This gives full access to all Monaco editor commands (Go to Line, Change Language Mode, Toggle Word Wrap, etc.) without any additional UI code.
