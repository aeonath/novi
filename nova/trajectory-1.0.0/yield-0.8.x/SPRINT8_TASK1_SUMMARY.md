# Sprint 8 — Task 1 Summary: Create New Settings Tab

**Date:** 2026-03-07
**Branch:** dev-core

## Objectives
- Replace the old inaccessible settings modal with a proper Settings tab
- Settings tab accessible from Novi -> Settings menu (CmdOrCtrl+,)
- File tree sidebar replaced with settings section navigation when on settings tab
- Three sections: Terminal, Editor, Novi
- Placeholder content ("Settings coming.") for each section

## Checklist
- [x] Create `SettingsTab` component with section switching
- [x] Create `SettingsSidebar` component with section list
- [x] Add `'settings'` to menu commands in `menu.ts`
- [x] Add `'settings'` type to TabBar and ActiveTab
- [x] Wire up settings tab creation in App.ts `onOpenSettings` action
- [x] Route `'settings'` menu command in `handleMenuCommand`
- [x] Show settings sidebar / hide file tree when settings tab active
- [x] Handle settings tab in `onTabSwitch` (status bar)
- [x] Disable font/save/editor commands for settings tab type
- [x] Remove old `SettingsPanel.ts` and `settings-panel.ts`
- [x] Remove old settings panel test
- [x] Add Jest `.js` -> `.ts` module name mapping
- [x] Write unit tests for SettingsTab (9 tests)
- [x] Write unit tests for SettingsSidebar (9 tests)
- [x] All tests pass (634 passed, 0 failed)
- [x] Build compiles successfully

## Files Changed
| File | Action |
|------|--------|
| `src/renderer/components/SettingsTab.ts` | Created |
| `src/renderer/components/SettingsSidebar.ts` | Created |
| `src/renderer/components/App.ts` | Modified |
| `src/renderer/components/TabBar.ts` | Modified |
| `src/renderer/components/TitleBar.ts` | Modified |
| `src/main/menu.ts` | Modified |
| `jest.config.js` | Modified |
| `src/tests/core-0.8.0/settings-tab.test.ts` | Created |
| `src/tests/core-0.8.0/settings-sidebar.test.ts` | Created |
| `src/renderer/components/SettingsPanel.ts` | Deleted |
| `src/renderer/components/settings-panel.ts` | Deleted |
| `src/tests/core-0.2.0/settings-panel.test.ts` | Deleted |

## Tests
- 37 suites, 634 tests passed, 0 failed
