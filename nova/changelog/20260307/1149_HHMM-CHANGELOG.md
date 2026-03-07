# Changelog — 2026-03-07 11:49

## Sprint8 Task1: Create new Settings tab

### Problem
The old settings modal (`SettingsPanel.ts` / `settings-panel.ts`) was inaccessible from the
current UI — no menu item or shortcut pointed to it. Settings needed to be a proper tab
with sidebar navigation, not a modal overlay.

### What Changed
Created a new Settings tab system with sidebar section navigation:

- **`SettingsTab.ts`** — New component that renders settings content area. Shows
  "[Section] Settings" heading and "Settings coming." placeholder. Supports `terminal`,
  `editor`, and `novi` sections via a `section` getter/setter.
- **`SettingsSidebar.ts`** — New component that replaces the file tree when the settings
  tab is active. Lists Terminal, Editor, Novi sections with active highlight and click handler.
- **`App.ts`** — Wired up settings tab:
  - Added `'settings'` to `ActiveTab.type`
  - Created DOM containers for settings content and sidebar
  - Mount `SettingsTab` and `SettingsSidebar` in `mountChildComponents`
  - `updateContentVisibility`: shows settings container for settings tabs
  - `updateSidebarVisibility`: shows settings sidebar, hides file tree and git panel
  - `handleMenuCommand`: routes `'settings'` command to `onOpenSettings`
  - `onOpenSettings` action: creates settings tab (or switches to existing one)
  - `onTabSwitch`: sets status bar to "Settings" for settings tabs
  - `currentFileTreeDisplayRoot` / `updateFileTreeDisplayRoot`: settings treated like novi-prompt
- **`TabBar.ts`** — Added `'settings'` to `Tab.type` union
- **`TitleBar.ts`** — Settings tab disables font, save, and editor-only menu commands
- **`menu.ts`** — Added `'settings'` to `MenuCommand` type, added Settings menu item
  as first item in Novi submenu with `CmdOrCtrl+,` accelerator

### Removed
- `src/renderer/components/SettingsPanel.ts` — Old modal settings panel
- `src/renderer/components/settings-panel.ts` — Old settings panel implementation
- `src/tests/core-0.2.0/settings-panel.test.ts` — Test for deleted source file

### Also Changed
- `jest.config.js` — Added `moduleNameMapper` rule to resolve `.js` imports to `.ts`
  for renderer component tests

### Files Changed
- `src/renderer/components/SettingsTab.ts` — new
- `src/renderer/components/SettingsSidebar.ts` — new
- `src/renderer/components/App.ts` — settings tab wiring
- `src/renderer/components/TabBar.ts` — type union update
- `src/renderer/components/TitleBar.ts` — menu disable logic
- `src/main/menu.ts` — settings command + menu item
- `jest.config.js` — .js → .ts module name mapper
- `src/tests/core-0.8.0/settings-tab.test.ts` — new (9 tests)
- `src/tests/core-0.8.0/settings-sidebar.test.ts` — new (9 tests)
- `src/renderer/components/SettingsPanel.ts` — deleted
- `src/renderer/components/settings-panel.ts` — deleted
- `src/tests/core-0.2.0/settings-panel.test.ts` — deleted

### Tests
- 634 passed, 0 failed (37 suites)

### Commit
`TBD`
