# Changelog — 2026-08-09 21:47

## Feature (Phase 2 of 3): Keyboard Shortcuts settings — Terminal + Editor category

### Summary
Continuation of the Keyboard Shortcuts feature (Phase 1 shipped the Novi
category end-to-end). This phase populates the **Terminal + Editor**
subsection with the 13 app-defined commands that are shared between the two
contexts — Save, Save As, Undo, Redo, Cut, Copy, Paste, Find, Replace,
Select All, and Increase/Decrease/Reset Font Size — each with one config
entry that routes to whichever tab (file/image editor or terminal) is
actually focused, exactly matching the user's requirement that "things like
Ctrl+A should work in the terminal and the editor."

Along the way this fixed two things that were already broken, found while
making the surrounding shortcuts real:
- **Select All never had a working keyboard shortcut at all.** Ctrl+A
  wasn't bound anywhere in the app; it always just reached the terminal/OS
  directly. It's now a real, default `CmdOrCtrl+A` binding — the exact gap
  the user pointed at.
- **Find/Replace were dead no-ops.** `handleMenuCommand`'s `'find'`/`'replace'`
  cases did nothing; a separate, always-on, unconditional document-level
  listener in `MonacoEditor.ts` fired Monaco's find widget regardless of
  what was actually focused. Both are now real, customizable, and only
  fire while a file tab is focused.

### How it works
9 of the 13 commands (Save/Save As/Undo/Redo/Cut/Copy/Paste/Find/Replace)
used to be real Electron native menu accelerators. They now use
`registerAccelerator: false` in `menu.ts` — the menu still shows the current
key combo next to each item for mouse users, but no longer claims it at the
OS level. Real triggering moved entirely into the renderer: `App.ts`'s
`setupKeyboardShortcuts()` now matches the pressed combo against every
Terminal+Editor shortcut's effective accelerator and dispatches through the
existing `handleMenuCommand()` routing (unchanged — still `activeTab.type`-based:
file/image → `__monacoEditorAPI`, terminal → `__terminalAPI[id]`).

Since Electron no longer natively intercepts these combos, `Terminal.ts`'s
`attachCustomKeyEventHandler` now explicitly blocks (returns `false` for)
any combo claimed by a Terminal+Editor shortcut, so xterm doesn't receive
it — preserving today's actual behavior (these combos were already
unreachable by the terminal, since the native accelerator intercepted them
first) while making the combo itself configurable. Terminal.ts caches the
shortcut settings at module level (one shared copy across every open
terminal tab, refreshed on the same `novi-keyboardshortcuts-changed` event
Phase 1 introduced) rather than threading them through each instance.

Increase/Decrease/Reset Font Size never had real accelerators (just
decorative shortcut labels in the app's custom title-bar menu, `Ctrl+Plus`/
`Ctrl+-`/`Ctrl+0`, that collided with the Novi category's real app-zoom
bindings on the same keys). They now default to `Ctrl+Shift+=`/`Ctrl+Shift+-`/
`Ctrl+Shift+0`, and `TitleBar.ts`'s labels were corrected to match.

### Files Changed

| File | Change |
|------|--------|
| `src/core/shortcuts/shortcut-registry.ts` | Populated `EDITOR_TERMINAL_SHORTCUTS` (13 entries), each carrying a `monacoCommandId` where one exists, ready for Phase 3; added a "no two defaults collide" regression test |
| `src/main/menu.ts` | Save/Save As/Undo/Redo/Cut/Copy/Paste/Find/Replace menu items switch to `registerAccelerator: false` with a display-only effective accelerator via a new `getEffectiveEditorTerminalAccelerators()` |
| `src/renderer/components/App.ts` | `setupKeyboardShortcuts()` now also matches Terminal+Editor shortcuts and dispatches via `handleMenuCommand()`; `'find'`/`'replace'` cases implemented (were no-ops) |
| `src/renderer/components/MonacoEditor.ts` | Added `openFind`/`openReplace` to `__monacoEditorAPI`; removed the redundant always-on document-level Ctrl+F/Ctrl+H listener |
| `src/renderer/components/Terminal.ts` | Module-level cached shortcut settings; `attachCustomKeyEventHandler` now defers to any claimed Terminal+Editor shortcut; exported `isClaimedByAppShortcut` for direct testing |
| `src/renderer/components/TitleBar.ts` | Corrected the 3 font-size menu items' decorative shortcut labels to the new real defaults |
| `src/tests/core-0.8.0/terminal-app-shortcuts.test.ts` (new) | 7 tests directly against `isClaimedByAppShortcut` |
| `src/tests/core-0.8.0/settings-keyboard-shortcuts.test.ts` | Added 2 tests: Terminal+Editor sub-tab renders its real shortcuts (was asserting "empty" in Phase 1), recording one persists under the `editorTerminal` category |

### Test Results
- 57 suites passed, 0 failed (835 tests, 9 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully — this run's `tsc` step caught a real type error in `Terminal.ts` (an untyped generic call) before it could ship, confirming the build pipeline does reach this file (it's transitively imported by several existing terminal tests even though `src/renderer` itself is excluded from the main tsconfig)
- `App.ts` (not reached by any test import) manually cross-checked again with `npx tsc -p tsconfig.renderer.json --noEmit`: no new errors beyond the same pre-existing baseline noted in the Phase 1 changelog

### To verify manually
Open a terminal tab, select some text, press Ctrl+C, confirm it copies
(same as before). Focus a file tab, press Ctrl+A, confirm it selects all
text; switch to a terminal tab, press Ctrl+A, confirm the terminal's
"select all" fires instead of whatever Ctrl+A did previously in that
terminal. Open Options → Keyboard Shortcuts → Terminal + Editor, uncheck
Use Defaults, rebind Save to something else, confirm the File menu's Save
item updates its displayed shortcut and the old Ctrl+S no longer saves
while the new combo does.

### Commit
TBD
