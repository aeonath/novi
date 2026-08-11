# Changelog — 2026-08-10 23:10

## Ad hoc: Add tabs-vs-spaces indentation settings + Convert Tabs to Spaces

### Summary
User requested an editor indentation feature: a "Convert Tabs to Spaces"
action, a default of spaces at 4 per indent, an option to use real tabs
instead, and a tab-size setting that also controls how wide existing tab
characters render — kept as a minimal, single settings section.

### Design
Monaco's built-in model options (`tabSize`, `insertSpaces`) already cover
almost everything requested for free: `insertSpaces` controls what pressing
Tab inserts, and `tabSize` controls both the indent width *and* the render
width of existing tab characters, regardless of `insertSpaces` — exactly the
"tabs still take the size setting into account" behavior asked for. Monaco
also ships a built-in `editor.action.indentationToSpaces` command that
correctly converts a file's existing indentation, reusing the exact
`getAction(...).run()` pattern already used for Find/Replace — no need to
hand-roll a find/replace on `\t`.

- **`EditorService`** (each open file gets its own persistent Monaco model,
  cached across tab switches): added `setIndentationOptions(tabSize,
  insertSpaces)`, which applies the setting to every currently-open model
  (not just the active one) and remembers it as the default applied to any
  model created afterward — so the setting behaves as one global editor
  preference, consistent no matter which file is open when it changes.
- **`MonacoEditor.ts`**: added `setIndentation()` (self-contained, same
  "doesn't route through App.ts" pattern as Column Break/Show Ruler — loaded
  in `loadEditorPrefs()`, live-updated via a `novi-editorindentation-changed`
  window event) and exposed `convertTabsToSpaces()` on `__monacoEditorAPI`.
- **Settings UI**: new "Indentation" section in Editor Settings — one toggle
  ("Insert Spaces", default on) and one number field ("Tab Size", default 4,
  clamped 1–8), reusing the existing toggle-row/number-field-row components
  already used elsewhere in this same tab (no new UI primitives).
- **Menu**: added "Convert Tabs to Spaces" to the Edit menu (`TitleBar.ts`),
  file-tab-only (same `EDITOR_ONLY_COMMANDS` list as Command Palette/Close
  File) — an action, not a persisted setting, so it belongs in the menu
  rather than Settings, same as Format Document isn't in Settings either.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/services/editor-service.ts` | Added `setIndentationOptions()`; `getOrCreateModel()` now applies the current tabSize/insertSpaces to every newly created model |
| `src/renderer/components/MonacoEditor.ts` | Added `_insertSpaces`/`_tabSize` fields, `setIndentation()`, loading in `loadEditorPrefs()`, a `novi-editorindentation-changed` live-update listener, `tabSize`/`insertSpaces` in the initial `monaco.editor.create()` options, and `convertTabsToSpaces` on `__monacoEditorAPI` |
| `src/renderer/components/SettingsTab.ts` | New "Indentation" section (Insert Spaces toggle + Tab Size number field) in Editor Settings |
| `src/renderer/components/TitleBar.ts` | Added "Convert Tabs to Spaces" to the Edit menu, added to `EDITOR_ONLY_COMMANDS` |
| `src/renderer/components/App.ts` | Added `case 'convert-tabs-to-spaces':` to `handleMenuCommand()` |
| `src/tests/core-0.4.0/editor-service.test.ts` | Added `updateOptions: jest.fn()` to the mock model (needed once `getOrCreateModel` started calling it); 3 new tests for `setIndentationOptions()` |
| `src/tests/core-0.8.0/monaco-editor-indentation.test.ts` | New file — 3 tests for `MonacoEditor.setIndentation()` |
| `src/tests/core-0.8.0/settings-tab.test.ts` | New tests for the Indentation section; fixed checkbox/number-input indices shifted by the new rows; fixed a pre-existing latent race in "should cycle through all sections" (relied on the constructor's async initial render completing before its synchronous assertions ran — two more sequential `getSetting` awaits in `loadEditorPrefs()`-equivalent `loadSettings()` pushed it past that implicit timing) |
| `src/tests/core-0.8.0/titlebar-edit-menu.test.ts` | 3 new tests confirming Convert Tabs to Spaces is file-tab-only |

### Test Results
- 60 suites passed, 0 failed (915 tests, up from 903 — 12 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
