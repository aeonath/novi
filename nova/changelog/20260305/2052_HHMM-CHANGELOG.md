# Changelog — 2026-03-05 20:52

## Disable Save/Save As on terminal and Novi Shell tabs

### Summary
File > Save and File > Save As are now grayed out in the custom title bar menu when the active tab is a terminal or Novi Shell. The Ctrl+S keyboard shortcut also no-ops on these tab types. Save functionality only activates on file and image editor tabs.

### Implementation
- **TitleBar.ts**: Added `SAVE_COMMANDS` array (`['save', 'save-as']`). Menu items with these commands are disabled when `activeTabType` is `'terminal'` or `'novi-prompt'`.
- **App.ts `handleMenuCommand`**: Guarded `'save'` and `'save-as'` cases to only execute when `activeTab.type` is `'file'` or `'image'`.
- **App.ts keyboard shortcut**: Guarded the Ctrl+S handler with the same file/image tab check.

### Files Changed
- **`src/renderer/components/TitleBar.ts`** — Added `SAVE_COMMANDS` constant; extended disabled logic for save commands on terminal/novi-prompt tabs
- **`src/renderer/components/App.ts`** — Guarded save/save-as in `handleMenuCommand()` and Ctrl+S keyboard shortcut

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
