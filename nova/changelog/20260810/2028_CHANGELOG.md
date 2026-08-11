# Changelog — 2026-08-10 20:28

## Ad hoc: Remove Increase/Decrease/Reset Font Size keyboard shortcuts (menu-only now)

### Summary
User asked to remove the keyboard shortcuts for Increase/Decrease/Reset Font
Size entirely — not something used often enough to warrant a keybinding, the
View menu items are sufficient, and (per the user) they didn't even work
reliably in the terminal anyway.

### Changes
- Removed the `increase-font-size` / `decrease-font-size` / `reset-font-size`
  `ShortcutDef` entries from `EDITOR_TERMINAL_SHORTCUTS`
  (`shortcut-registry.ts`). This means:
  - They no longer appear in Settings → Keyboard Shortcuts (that list is
    rendered dynamically from the registry) — nothing left to customize.
  - `App.ts`'s keydown listener no longer matches `Ctrl+Shift+=`/`Ctrl+Shift+-`/`Ctrl+Shift+0`
    against them, so those key combos no longer do anything app-side.
  - `Terminal.ts`'s `isClaimedByAppShortcut()` (which just iterates
    `EDITOR_TERMINAL_SHORTCUTS`) no longer claims those keys either, so a
    terminal is free to handle/ignore them as it normally would.
- Removed the `shortcut: 'Ctrl+Shift+='` / `'Ctrl+Shift+-'` / `'Ctrl+Shift+0'`
  display hints from the three View-menu items in `TitleBar.ts`'s `MENUS`
  table — the items themselves (label + `command`) are untouched, so
  clicking "Increase Font Size" etc. in the View menu still works exactly as
  before (menu-item clicks dispatch straight to `App.handleMenuCommand()`,
  entirely independent of the shortcut registry). They just no longer show a
  now-nonexistent keyboard shortcut next to the label.
- `App.ts`'s `handleMenuCommand()` cases for these three ids, and
  `handleFontSizeCommand()` itself, are unchanged — still needed for the
  menu-click path.

### Files Changed

| File | Change |
|------|--------|
| `src/core/shortcuts/shortcut-registry.ts` | Removed the three font-size `ShortcutDef` entries from `EDITOR_TERMINAL_SHORTCUTS` |
| `src/renderer/components/TitleBar.ts` | Dropped the `shortcut` hint field from the three View-menu font-size items (kept label/command) |

### Test Results
- 58 suites passed, 0 failed (894 tests — unchanged; `titlebar-view-menu.test.ts`'s
  existing assertions only check label text and disabled state, not the
  removed shortcut hint text, so nothing needed updating)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
