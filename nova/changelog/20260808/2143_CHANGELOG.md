# Changelog — 2026-08-08 21:43

## Ad hoc: Shift+Insert pastes in the editor

### Summary
Registered Shift+Insert (the classic X11/Windows terminal-style paste
shortcut) as a Monaco command via `editor.addCommand()`, reusing the
existing `handlePaste()` method already used by Ctrl+V and the editor's
right-click "Paste" menu item — the Electron-clipboard-backed path
(`window.api.clipboardReadText()` + `executeEdits`), not Monaco's own
built-in clipboard actions, which can be unreliable under Electron's
clipboard permission model. `addCommand` scopes the binding to the editor's
own keybinding context, so it only fires while the editor actually has
focus.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/MonacoEditor.ts` | Added `this.editor.addCommand(monaco.KeyMod.Shift \| monaco.KeyCode.Insert, () => void this.handlePaste())` right after editor creation |

### Test Results
- 46 suites passed, 0 failed (713 tests — no new tests; the existing
  `__mocks__/monaco-editor.ts` mock is too minimal to construct
  `MonacoEditor.ts`'s real `createEditor()` path at all (no `addCommand`,
  `KeyMod`/`KeyCode`, cursor/model APIs, etc.), and no existing test in this
  codebase does — building that harness for one `addCommand` call would be
  disproportionate to the change; relying on the full suite plus manual
  verification, consistent with how the `App.ts`/menu changes earlier today
  were handled)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
