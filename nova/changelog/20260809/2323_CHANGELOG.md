# Changelog — 2026-08-09 23:23

## Fix: Split "Editor" out of "Terminal + Editor" — Save/Undo no longer break real terminal control keys

### Summary
User-reported correctness bug in the just-shipped Keyboard Shortcuts feature:
Save, Save As, Close File, Undo, Redo, Find, Replace, and all 28 Monaco
built-in commands had been bucketed into the shared "Terminal + Editor"
category, alongside Copy/Paste/Select All/font-size (which genuinely do mean
the same thing in both contexts). None of those eight app-defined commands
have any meaning in a terminal — and two of them actively collided with real
terminal control-character semantics that were being silently broken:
**Ctrl+S is XOFF** (pause output) and **Ctrl+Z is SIGTSTP** (suspend the
foreground process). Phase 2's global key interception was preventing both
from ever reaching the shell.

### What changed
Added a third top-level shortcut category, `editor`, sitting alongside the
existing `novi` and `editorTerminal` categories — so Options → Keyboard
Shortcuts now has three sub-tabs: **Novi**, **Terminal + Editor**, **Editor**.

- **Moved out of `editorTerminal` into the new `editor` category**: `save`,
  `save-as`, `undo`, `redo`, `find`, `replace` (6 app-defined commands), plus
  all 28 Monaco-only built-ins (Fold, Rename Symbol, Go to Definition, etc.)
  that were added in Phase 3. `editorTerminal` now holds exactly the 7
  commands that are genuinely identical in both contexts: Cut, Copy, Paste,
  Select All, Increase/Decrease/Reset Font Size.
- **Moved out of `novi` into the new `editor` category**: `close-file` and
  `reload-file` — a terminal has no open file to close or reload, so these
  never belonged in an app-level (workspace-scope) category either.
- **`Terminal.ts`'s `isClaimedByAppShortcut()` required no code change** —
  it already only iterates `EDITOR_TERMINAL_SHORTCUTS`, never the new
  `EDITOR_SHORTCUTS` array, so simply removing Save/Undo/etc. from that
  first array is what un-blocks Ctrl+S/Ctrl+Z from reaching xterm. This was
  the whole fix on the terminal side.
- **`App.ts`'s keydown dispatcher** gained a 4th matching block, scoped to
  only the 8 app-defined Editor commands (the 28 Monaco-only ones need no
  App.ts dispatch — `addKeybindingRules` handles those internally). Critically,
  this block is gated on `this.activeTab?.type === 'file' || 'image'` and,
  when that's false, does **nothing at all** — no `preventDefault()`, no
  dispatch — so a focused terminal (or no tab) keeps native key behavior for
  the same combo instead of the app silently swallowing it.
- **`menu.ts`** gained `getEffectiveEditorAccelerators()`, mirroring the
  existing Novi/shared accelerator resolvers. Save, Save As, Close File,
  Undo, Redo, Find, Replace menu items now read from it. All of them (Close
  File newly included) use `registerAccelerator: false` — display-only,
  since the real key handling now goes through the JS-level Editor dispatch
  above, not an OS-level menu accelerator.
- **`SettingsTab.ts`** — third sub-tab pill added; no other UI changes.
- **New shared helper**: `mergeKeyboardShortcutsSettings()` in
  `shortcut-registry.ts`, replacing five hand-rolled 3-field settings-merge
  call sites (menu.ts, App.ts, SettingsTab.ts, Terminal.ts, MonacoEditor.ts)
  that all broke with a missing-property TS error the moment the `editor`
  field was added to `KeyboardShortcutsSettings` — fixed once, centrally,
  instead of patching each site individually.

### Files Changed

| File | Change |
|------|--------|
| `src/core/shortcuts/shortcut-registry.ts` | Added `'editor'` to `ShortcutCategory`; added `editor` field to `KeyboardShortcutsSettings`; new `EDITOR_SHORTCUTS` (36 entries: 8 app-defined + 28 Monaco-only); trimmed `EDITOR_TERMINAL_SHORTCUTS` to 7; trimmed `NOVI_SHORTCUTS` (removed close-file, reload-file); new `mergeKeyboardShortcutsSettings()` |
| `src/main/menu.ts` | New `getEffectiveEditorAccelerators()`; Save/Save As/Close File/Undo/Redo/Find/Replace menu items switched to it with `registerAccelerator: false` |
| `src/renderer/components/App.ts` | Removed `reload-file` from `APP_ONLY_NOVI_ACTIONS`; new `APP_DISPATCHED_EDITOR_IDS` set + 4th dispatch block in `setupKeyboardShortcuts()`, gated to file/image tab focus only |
| `src/renderer/components/Terminal.ts` | No logic change — doc comment updated to state the design intent explicitly (XOFF/SIGTSTP) |
| `src/renderer/components/SettingsTab.ts` | Third `{ id: 'editor', label: 'Editor' }` sub-tab added |
| `src/renderer/components/MonacoEditor.ts` | Merge call switched to `mergeKeyboardShortcutsSettings()` |
| `src/tests/core-0.8.0/shortcut-registry.test.ts` | Updated fixtures to use `mergeKeyboardShortcutsSettings()`; conflict test rewritten around `editor.overrides.save` instead of the now-relocated `close-file`; new cross-category conflict test |
| `src/tests/core-0.8.0/terminal-app-shortcuts.test.ts` | `'claims Ctrl+S'` test flipped to assert `false`, renamed to document the XOFF fix; new symmetric Ctrl+Z/SIGTSTP non-claim test; doc comment updated |
| `src/tests/core-0.8.0/settings-keyboard-shortcuts.test.ts` | Terminal+Editor render test updated to assert Save/Fold/Rename Symbol are absent; two new tests added covering the Editor sub-tab's contents and override persistence |

### Test Results
- `npm test`: 57 suites passed, 0 failed, **856 tests passed** (4 new, 0 regressed)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### To verify manually
Open a terminal tab, press Ctrl+S — output should pause (XOFF) exactly like
a real shell, not get swallowed. Press Ctrl+Q to resume. Then Ctrl+Z should
suspend the foreground job (`fg` to resume) instead of doing nothing. Switch
to a file tab and confirm Ctrl+S still saves normally. In Options → Keyboard
Shortcuts, confirm the three sub-tabs (Novi / Terminal + Editor / Editor)
each show the right commands, with no overlap.

### Commit
TBD
