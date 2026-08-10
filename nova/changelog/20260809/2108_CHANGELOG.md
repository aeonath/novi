# Changelog — 2026-08-09 21:08

## Feature (Phase 1 of 3): Keyboard Shortcuts settings — Novi category

### Summary
New "Keyboard Shortcuts" section in Options, requested as a full feature:
view and remap every shortcut in the app, organized into "Novi" (app-level)
and "Terminal + Editor" (combined, since several commands like Copy/Paste/
Select All must behave identically in both contexts) subsections. Each
subsection has its own "Use Defaults" checkbox — checked shows a read-only
list; unchecked reveals a click-to-record control per shortcut. Attempting
to set a combination already in use by another command is rejected with an
inline "Already in use by ..." warning instead of being saved, so two
commands can never collide.

Given the size (a full inventory turned up ~25 app-defined shortcuts plus
~65 of Monaco's own built-in editor keybindings, mined directly from
Monaco's source since its public API has no "list all defaults" method),
this ships in three phases, each independently tested and committed. This
is **Phase 1**: the registry/conflict-detection infrastructure, the full
settings UI (both subsections render, but only Novi has entries so far),
and the Novi category working end-to-end — customizing a Novi shortcut
actually changes the real OS-level Electron menu accelerator.

### What's in Phase 1
- **Novi subsection**, 15 commands: New File, Open File, Close File, Exit,
  Toggle Full Screen, Zoom In/Out/Reset (app window zoom), Settings, New
  Terminal, Toggle Developer Tools (all real Electron menu accelerators),
  plus Reload File from Disk, Refresh Git Status, Cycle to Next/Previous Tab
  (existing `App.ts`-only shortcuts that never had a menu entry).
- **Terminal + Editor subsection**: renders (heading, sub-tab, Use Defaults
  toggle) but is intentionally empty of entries until Phase 2 — the ~11
  shared app-defined commands (Copy/Paste/Cut/Undo/Redo/Find/Replace/Select
  All/Save/Save As/font size) and Phase 3's Monaco built-ins land there.
- **Conflict detection**: global across both categories — an override is
  checked against every other command's *current effective* binding
  (default or already-customized) before being saved.
- **Live-apply**: saving a Novi override calls `setSetting('keyboardShortcuts', ...)`,
  which `main.ts` now recognizes to rebuild and reapply the native Electron
  menu (`buildMenu` + `Menu.setApplicationMenu` — the same pattern already
  used for the DevTools toggle), so the change takes effect immediately, no
  restart. A `novi-keyboardshortcuts-changed` window event keeps `App.ts`'s
  own copy (used only for the 4 shortcuts with no menu item) in sync too.

### Design notes
- Accelerators are stored/compared in Electron's own string format
  (`"CmdOrCtrl+Shift+N"`) everywhere, normalized (modifier order, letter
  case) before comparison so `"Shift+CmdOrCtrl+n"` and `"CmdOrCtrl+Shift+N"`
  are recognized as the same combination.
- `ShortcutRecorder` (new component) captures the next real keydown after
  being clicked; Escape cancels. It owns a `window`-level listener only
  while actively recording — `SettingsTab.render()` now destroys any
  in-flight recorder before rebuilding the DOM, so switching sections or
  sub-tabs mid-recording can't leak that listener.
- `App.ts`'s `setupKeyboardShortcuts()` no longer hardcodes key checks for
  the commands it owns exclusively (reload/git-refresh/cycle-tab) — it now
  matches the pressed combination against each command's current effective
  accelerator from the registry. Open File's existing defensive in-renderer
  binding (a backup alongside its menu accelerator) was updated the same
  way so a customized Open File shortcut isn't silently ignored by one of
  its two trigger paths.

### Files Changed

| File | Change |
|------|--------|
| `src/core/shortcuts/shortcut-registry.ts` (new) | Static registry (15 Novi entries so far), `computeEffectiveAccelerator`, `findConflict`, `normalizeAccelerator`, `acceleratorFromKeyboardEvent`, `formatAcceleratorForDisplay` — all pure, no DOM/Electron dependency |
| `src/renderer/components/ShortcutRecorder.ts` (new) | Click-to-record shortcut widget |
| `src/renderer/components/SettingsTab.ts` | New `'keyboard-shortcuts'` section: sub-tab nav, Use Defaults toggle, per-row rendering (read-only badge or recorder + reset-to-default + inline conflict warning), optional filter input for long lists, `persistShortcutSettings()` |
| `src/renderer/components/SettingsSidebar.ts` | New sidebar entry between Extensions and Novi |
| `src/main/menu.ts` | `createMenuTemplate` now resolves each Novi command's accelerator through `getEffectiveNoviAccelerators()` instead of a hardcoded string |
| `src/main/main.ts` | `set-setting` handler rebuilds+reapplies the menu when `key === 'keyboardShortcuts'` |
| `src/renderer/components/App.ts` | Loads/reloads `keyboardShortcuts` settings; `setupKeyboardShortcuts()` generalized for the 4 App.ts-only Novi commands + Open File's backup binding |
| `src/tests/core-0.8.0/shortcut-registry.test.ts` (new) | 24 tests: effective-accelerator resolution, conflict detection (defaults, overrides, unbound), normalization, KeyboardEvent→accelerator conversion, display formatting |
| `src/tests/core-0.8.0/shortcut-recorder.test.ts` (new) | 9 tests: capture, modifier-only wait, Escape cancel, disabled state, destroy-mid-recording listener cleanup |
| `src/tests/core-0.8.0/settings-keyboard-shortcuts.test.ts` (new) | 7 tests: full end-to-end UI flow — render, toggle Use Defaults, record+persist an override, conflict rejection, reset-to-default, sub-tab switch |
| `src/tests/core-0.8.0/settings-sidebar.test.ts` | Updated for the 5th sidebar entry (was hardcoded to 4 items / Novi-at-index-3) |

### Test Results
- 56 suites passed, 0 failed (826 tests, 40 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- `App.ts` isn't covered by `npm run build`'s tsc (renderer excluded from the main tsconfig) or, until now, any test — manually cross-checked with `npx tsc -p tsconfig.renderer.json --noEmit`; the only errors reported are pre-existing ones unrelated to this change (same `rootDir` config limitation already hit by `ImageEditor.ts`'s existing `image-utils.ts` import, plus unrelated pre-existing unused-variable/type gaps elsewhere in the file)

### To verify manually
Open Options → Keyboard Shortcuts → Novi, uncheck Use Defaults, click New
File's shortcut box, press e.g. Ctrl+Shift+N — the File menu should
immediately show "New File Ctrl+Shift+N" and pressing it should open a new
file tab. Try setting two commands to the same combination to see the
"Already in use by ..." warning.

### Commit
TBD
