# Changelog — 2026-08-10 20:41

## Ad hoc: Add Ctrl+F4 "Close Tab" to Terminal + Editor shortcuts

### Summary
User requested a new keyboard shortcut, `Ctrl+F4`, to close the current
tab, added under the Terminal + Editor category so it works for both a file
tab and a terminal tab.

### Implementation
- Added `{ id: 'close-tab', category: 'editorTerminal', label: 'Close Tab', defaultAccelerator: 'CmdOrCtrl+F4' }`
  to `EDITOR_TERMINAL_SHORTCUTS` in `shortcut-registry.ts`. No accelerator
  collision (checked against `Alt+F4`/Exit and the rest of the registry; the
  suite's existing "no two default accelerators collide" test covers this
  generically going forward too).
- Added `case 'close-tab':` to `App.ts`'s `handleMenuCommand()`: for a file
  tab it delegates to the existing `onCloseFile` action (so the unsaved-
  changes Save/Discard/Cancel prompt still applies exactly like Ctrl+W);
  for any other tab type (terminal, image, settings) it closes directly via
  `__tabBarAPI.closeTab()`, the same path `close-terminal` already uses.
- No `menu.ts` or `TitleBar.ts` changes needed — EDITOR_TERMINAL_SHORTCUTS
  entries dispatch through App.ts's own keydown listener (the same
  bubble-phase loop Copy/Paste/Select All already use), not a native
  Electron menu accelerator, and this request was for a shortcut only, not
  a new menu item. It also automatically shows up in Settings → Keyboard
  Shortcuts' merged Terminal + Editor tab (dynamically rendered from the
  registry) and is customizable/rebindable there like any other shortcut in
  that category. `Terminal.ts`'s `isClaimedByAppShortcut()` — which just
  iterates `EDITOR_TERMINAL_SHORTCUTS` — automatically picks it up too, so
  a terminal won't swallow `Ctrl+F4` before it reaches this handler.

### Side note (not acted on)
While tracing this, found `src/renderer/vim/cm/keymap_vim.ts` — part of an
in-repo vendored copy of `monaco-vim` (see `src/renderer/vim/README.md`,
"maintained in-repo so we can patch and build without depending on the
upstream npm package") — references a Novi-specific `window.__noviVimQuit`
integration point that `App.ts` still defines (`onMount`, cleaned up on
destroy). Neither this vendored copy nor `__noviVimQuit` is actually wired
into the build (`build-renderer.js` has no alias pointing 'monaco-vim' at
it; `MonacoEditor.ts` dynamically imports the real npm package instead), so
it's dead code today — the working `:w`/`:q`/`:wq` implementation added
earlier this session (`saveActiveVimFile`/`closeActiveVimFile` in
`MonacoEditor.ts`, wired via `Vim.defineEx` against the actual npm package)
is what the shipped app runs. Flagging in case the vendoring effort was
meant to be finished at some point — not touched here, out of scope for
this request.

### Files Changed

| File | Change |
|------|--------|
| `src/core/shortcuts/shortcut-registry.ts` | Added `close-tab` to `EDITOR_TERMINAL_SHORTCUTS` (`CmdOrCtrl+F4`) |
| `src/renderer/components/App.ts` | Added `case 'close-tab':` to `handleMenuCommand()` |
| `src/tests/core-0.8.0/shortcut-registry.test.ts` | New test confirming `close-tab`'s id/category/default accelerator |
| `src/tests/core-0.8.0/settings-keyboard-shortcuts.test.ts` | Extended the merged-tab test to also assert "Close Tab" / "Ctrl+F4" render there |

### Test Results
- 58 suites passed, 0 failed (896 tests, up from 895 — 1 new test added to
  `shortcut-registry.test.ts`, one existing test in
  `settings-keyboard-shortcuts.test.ts` extended in place)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
