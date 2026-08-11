# Changelog — 2026-08-10 20:33

## Ad hoc: Merge the Novi keyboard-shortcuts tab into Terminal + Editor

### Summary
User asked to merge the "Novi" keyboard-shortcuts sub-tab into "Terminal +
Editor" — since you're mainly ever in a terminal or an editor, a separate
Novi tab just added a click with no real benefit; the "Editor" (editor-only)
sub-tab stays separate since it's genuinely meaningless in a terminal.

### Changes
Purely a Settings UI/navigation change — no data-model migration. The
underlying `KeyboardShortcutsSettings` shape (`novi`/`editorTerminal`/`editor`,
each with its own `useDefaults`/`overrides`) is completely unchanged, so
every existing saved override still resolves exactly as before; it's just
displayed differently:

- `SettingsTab.ts`'s Keyboard Shortcuts sub-nav now shows only **"Terminal +
  Editor"** and **"Editor"** — the "Novi" pill is gone. Default sub-tab
  changed from `'novi'` to `'editorTerminal'`.
- Selecting "Terminal + Editor" now renders `NOVI_SHORTCUTS` and
  `EDITOR_TERMINAL_SHORTCUTS` concatenated into one list (Terminal+Editor
  entries first, Novi entries after).
- The "Use Defaults" toggle at the top of that merged tab now controls
  **both** underlying categories together — checked only when `novi` and
  `editorTerminal` are both already using defaults; toggling it sets both.
  Each row still independently reads its own category's `useDefaults` when
  deciding whether to show a read-only badge or an editable recorder, so
  nothing renders incorrectly even if the two categories were ever left out
  of sync by a settings file saved before this change.
- Recording an override or resetting a shortcut on the merged tab still
  writes to the *correct* underlying category (`novi.overrides` for e.g. New
  File, `editorTerminal.overrides` for e.g. Select All) — `def.category` on
  each shortcut definition was always used for that, unaffected by which
  visual tab it's displayed under.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/SettingsTab.ts` | Dropped the "Novi" sub-tab pill; `renderKeyboardShortcutsSettings()` now merges `novi` + `editorTerminal` defs on the "Terminal + Editor" tab with a combined "Use Defaults" toggle; default `shortcutsSubTab` changed to `'editorTerminal'` |
| `src/tests/core-0.8.0/settings-keyboard-shortcuts.test.ts` | Rewrote to match the merged tab: no "Novi" pill, Novi shortcuts (New File, New Terminal) visible on the default "Terminal + Editor" tab alongside Copy/Select All, merged "Use Defaults" toggle sets both categories, per-category override persistence still verified for both a Novi shortcut and a Terminal+Editor shortcut recorded from the same tab |

### Test Results
- 58 suites passed, 0 failed (895 tests, up from 894 — net +1 after rewriting the affected file)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
