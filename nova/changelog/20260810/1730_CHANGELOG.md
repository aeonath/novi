# Changelog — 2026-08-10 17:30

## Ad hoc: Add default font size and font family settings for Editor and Terminal

### Summary
User reported the default font size is too small on desktop, and that font
family couldn't be selected at all. A font size setting already existed
(`fontSize`/`terminalFontSize`, adjustable only via the View menu's
Increase/Decrease/Reset Font Size commands and their keyboard shortcuts) but
had no UI in the Settings/Options panel. Font family was 100% hardcoded to
`'DejaVu Sans Mono', monospace` in both `MonacoEditor.ts` and `Terminal.ts`,
with no setting at all.

### Changes
- **`MonacoEditor.ts`**: added a `fontFamily` config option and a `set
  fontFamily(family)` setter (mirrors the existing `set fontSize`), applying
  live via `editor.updateOptions({ fontFamily })`. The hardcoded font-family
  string in `initEditor()`'s `monaco.editor.create()` call now reads from
  this setting.
- **`Terminal.ts`**: added a `fontFamily` config option and a `fontFamilyProp`
  setter (mirrors the existing `fontSizeProp`, including its no-op guard and
  fit/resize-on-change behavior). Both xterm.js constructor call sites
  (`initPhase1`'s measurement `tempTerminal` and `initDisplay`'s real
  terminal) now read from this setting instead of the hardcoded string.
- **`SettingsTab.ts`**:
  - Added a `createSelectFieldRow()` helper (native `<select>`, modeled on
    `ImageEditor.ts`'s existing dropdown) alongside the existing
    `createNumberFieldRow()`, which now takes optional `min`/`max` params
    (defaulting to the prior `1`/`500`) so the new font-size fields can clamp
    to `[10, 24]` — the same range the View menu's zoom shortcuts already
    clamp to, so the two controls (Settings field, `Ctrl+Shift+=/-`) stay
    consistent instead of fighting each other.
  - New "Font" section appended to both **Editor Settings** and **Terminal
    Settings**, each with a "Default Font Size" number field and a "Font
    Family" dropdown (DejaVu Sans Mono, Cascadia Code, Cascadia Mono,
    Consolas, Courier New, Fira Code, JetBrains Mono, Lucida Console, Source
    Code Pro). Editor's field reuses the existing `fontSize` setting key;
    Terminal's reuses `terminalFontSize`. Two new setting keys were added:
    `editorFontFamily` and `terminalFontFamily`.
  - Changes persist via `window.api.setSetting` and broadcast
    `novi-fontsize-changed` / `novi-terminalfontsize-changed` /
    `novi-editorfontfamily-changed` / `novi-terminalfontfamily-changed`
    window events, following the same pattern as the existing `wordwrap`/
    `columnbreak`/`showruler` settings.
- **`App.ts`**: added `editorFontFamily`/`terminalFontFamily` fields, loaded
  in `loadSettings()` and threaded into the `MonacoEditor`/`Terminal`
  constructors and `syncTerminalActiveState()` (alongside the existing
  `fontSizeProp` sync). Added the four event listeners above so a change
  made in the Settings panel applies live to the already-mounted editor and
  all open terminal tabs, not just newly-created ones.

No main-process changes were needed — the new setting keys go through the
existing generic `get-setting`/`set-setting` IPC handlers, same as
`wordwrap`/`fontSize`/etc., which have no main.ts side-effect case either.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/MonacoEditor.ts` | Added `fontFamily` config option + `set fontFamily()`; `initEditor()` now uses it instead of a hardcoded string |
| `src/renderer/components/Terminal.ts` | Added `fontFamily` config option + `fontFamilyProp` setter; both xterm constructor call sites now use it instead of a hardcoded string |
| `src/renderer/components/SettingsTab.ts` | Added `createSelectFieldRow()`; `createNumberFieldRow()` gained optional `min`/`max` params; new "Font" section (size + family) in both Editor and Terminal settings |
| `src/renderer/components/App.ts` | Added `editorFontFamily`/`terminalFontFamily` fields, loading, constructor wiring, `syncTerminalActiveState()` sync, and 4 new live-update event listeners |
| `src/tests/core-0.8.0/monaco-editor-column-break.test.ts` | New `MonacoEditor fontFamily` describe block (2 tests) |
| `src/tests/core-0.8.0/terminal-activate-no-resize.test.ts` | New `fontFamilyProp` tests (same-value no-op, changed-value fit/resize), mirroring the existing `fontSizeProp` tests |
| `src/tests/core-0.8.0/settings-tab.test.ts` | New tests for Editor/Terminal font size + font family rendering, clamping, persistence, and event broadcast |

### Test Results
- 57 suites passed, 0 failed (864 tests, up from 856 — 8 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
