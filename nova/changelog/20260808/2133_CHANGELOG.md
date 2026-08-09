# Changelog — 2026-08-08 21:33

## Ad hoc: Wire up Edit menu commands and per-tab enable/disable state

### Summary
Implemented the Edit menu's Undo/Redo/Cut/Copy/Paste/Select All: on a
terminal tab, Undo/Redo/Cut are grayed out (terminals have no undo concept)
while Copy/Paste/Select All work against the terminal's selection/clipboard;
on an editor (file) tab, all six work, with Redo specifically grayed out
until there's actually something to redo.

Two things had to happen for this to mean anything:

1. **These commands were entirely unimplemented.** `App.ts`'s
   `handleMenuCommand()` had `case 'undo': case 'redo': ... break;` — a
   pure no-op. Clicking any of these did nothing on either tab type before
   this change, regardless of graying.
2. **The visible menu the user actually interacts with is `TitleBar.ts`**,
   not Electron's native `Menu`. The window is frameless
   (`frame: false` in `main.ts`), so `Menu.setApplicationMenu()`'s menu bar
   has no visible region on Windows — it only exists to register global
   accelerators (Ctrl+Z, Ctrl+C, etc.) and the macOS app menu. The actual
   dropdown the user clicks is `TitleBar.ts`'s hand-built DOM menu, which
   already had a `disabled` computation keyed on `activeTabType` for other
   commands (Save, font size, etc.) — extended that same computation rather
   than touching the invisible native menu, which would have needed a new
   main↔renderer IPC channel just to stay informed of tab-type changes for
   no visible benefit on this platform.

Implementation:
- `MonacoEditor.ts`: added `undo`/`redo`/`cut`/`copy`/`paste`/`selectAll`/
  `canUndo`/`canRedo` to `window.__monacoEditorAPI`. Undo/redo/select-all
  go through `editor.trigger('menu', ...)` (Monaco's own command service,
  respecting the model's real undo/redo stack — the same mechanism Ctrl+Z
  already used); cut/copy/paste reuse the existing `handleCut`/`handleCopy`/
  `handlePaste` private methods already used by the editor's own right-click
  menu. `canRedo()` reads `editor.getModel()?.canRedo()` live.
- `Terminal.ts`: added `copy`/`paste`/`selectAll` to the
  `window.__terminalAPI[terminalId]` registry (the existing cross-component
  call pattern for terminals), reusing `handleCopy`/`handlePaste` and
  xterm.js's own `terminal.selectAll()`.
- `App.ts`: `handleMenuCommand()` now routes each command to
  `__monacoEditorAPI` on a file tab or `__terminalAPI[activeTab.id]` on a
  terminal tab; undo/redo/cut are file-tab-only (no-op on terminal, matching
  the graying).
- `TitleBar.ts`: extended the existing `disabled` computation — Undo/Redo/
  Cut disabled whenever the active tab isn't `file`; Redo additionally
  disabled on a file tab when `__monacoEditorAPI.canRedo()` is falsy (or
  the API isn't available yet); Copy/Paste/Select All disabled unless the
  active tab is `file` or `terminal`. Computed fresh each time the dropdown
  opens (`window.__monacoEditorAPI` is a live, synchronous renderer-side
  object — no IPC round-trip or caching needed).

While in `TitleBar.ts`, fixed two pre-existing compile blockers that
surfaced the moment a test imported it directly (nothing had before):
`MenuItem.label` was typed as required `string`, but every `{ separator:
true }` entry omits it (fine at runtime — the render loop `continue`s past
separators before touching `.label` — but not what strict `tsc` sees), so
made it optional; removed an unused `clearChildren` import.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/MonacoEditor.ts` | Added `undo`/`redo`/`cut`/`copy`/`paste`/`selectAll`/`canUndo`/`canRedo` to `window.__monacoEditorAPI` |
| `src/renderer/components/Terminal.ts` | Added `copy`/`paste`/`selectAll` to the `window.__terminalAPI[terminalId]` registry |
| `src/renderer/components/App.ts` | `handleMenuCommand()`'s undo/redo/cut/copy/paste/select-all cases now route to the active tab's editor or terminal API instead of being a no-op |
| `src/renderer/components/TitleBar.ts` | Edit menu items now gray out per active tab type, with Redo additionally gated on live `canRedo()`; made `MenuItem.label` optional and removed a dead import (pre-existing compile blockers hit while adding a direct test for this file) |
| `src/tests/core-0.8.0/titlebar-edit-menu.test.ts` | New: verifies Undo/Redo/Cut disabled on a terminal tab (Copy/Paste/Select All enabled), all six enabled on a file tab when `canRedo()` is true, only Redo disabled when `canRedo()` is false or `__monacoEditorAPI` is unavailable, and everything disabled with no active tab |

### Test Results
- 46 suites passed, 0 failed (712 tests, 5 new)
- Manually confirmed 4 of the 5 new tests fail when the new `disabled` rules are removed, then pass again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
