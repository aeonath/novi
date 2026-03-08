# Changelog — 20260308.0826

## Summary
Added "Show Hidden Files" toggle to the View menu (both custom title bar and Electron native menu) that controls whether dotfiles and dot-directories are displayed in the file tree.

## Files Changed
- `src/main/menu.ts` — Added `'show-hidden-files'` to `MenuCommand` union; added checkbox menu item to View submenu; imported `getSetting`
- `src/main/main.ts` — Handled `show-hidden-files` command (toggle setting + rebuild menu); added hidden file filter (`entry.name.startsWith('.')`) in `read-directory` handler; imported `Menu` and `buildMenu`
- `src/renderer/components/TitleBar.ts` — Extended `MenuItem` interface with `checkbox`, `settingKey`, `settingDefault`; added "Show Hidden Files" item to View menu; updated dropdown rendering to show checkmarks and toggle settings
- `src/renderer/components/App.ts` — Added `show-hidden-files` case in `handleMenuCommand`; added `novi-showhiddenfiles-changed` event listener to refresh file tree
- `src/renderer/components/NoviShell.ts` — Added `showhiddenfiles` to valid settings and event map

## Rationale
Users on Linux need the ability to view hidden files (those starting with `.`) in the file tree. This is off by default and can be toggled via the View menu or `set showhiddenfiles on` in Novi Shell.

## Test Results
- Build: ✅ Passes
- Tests: 642 passed, 4 failed (pre-existing failures in extension-loader and installer tests)

## Commit Hash
TBD
