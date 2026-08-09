# Changelog — 2026-08-08 22:41

## Ad hoc: Reorder Help menu; add Word Wrap / Column Break / Hard Break / Show Ruler editor settings

### Summary
Two parts: a menu reorder, and a new cluster of Editor Settings options.

**Help menu**: moved "About Novi" below "Check for Updates" in both the
visible menu (`TitleBar.ts`) and the native one (`main/menu.ts`).

**Settings → Editor section** — four new options, added after VI Mode:

- **Word Wrap** — the same `wordwrap` setting the View menu's checkbox
  already controls (added earlier today), now also exposed here. Changed
  its default from `true` to `false` per this request, across every place
  that read it: `TitleBar.ts`'s checkbox `settingDefault`, `App.ts`'s three
  `getSetting('wordwrap', ...)` calls, and `MonacoEditorConfig`'s fallback.
  A live-update listener (`novi-wordwrap-changed`) was added to `App.ts`,
  mirroring the existing `singlefiletree`/`gitenabled` pattern, so toggling
  it from Settings applies immediately — the View menu's own toggle already
  worked via `handleMenuCommand`.
- **Column Break** — a target line-length column (checkbox + number field,
  default 90), independent of Word Wrap. Off by default.
- **Hard Break** (sub-option of Column Break) — instead of Monaco's
  visual-only wrap, inserts a real newline as the user types past the
  column. Implemented via `editor.onDidType()` (fires only on actual
  keystrokes, not paste/programmatic edits) calling a new
  `maybeHardBreak()`: reads the current line and cursor position, and if
  both have reached the column boundary, calls `executeEdits()` to split
  the line there. Breaks exactly at the column, not the nearest word
  boundary — matches "insert a newline" as literally requested rather than
  smart reflow. Explicitly no-ops whenever Word Wrap is on, per "if wrap is
  toggled on we obviously will ignore this."
- **Show Ruler** — shows a vertical guide line via Monaco's native
  `rulers` editor option, positioned at Column Break's value (so toggling
  the column number moves the ruler too, even independent of whether
  Column Break itself or Hard Break are enabled).

Column Break / Hard Break / Show Ruler are purely editor-internal (nothing
outside `MonacoEditor.ts` needs their state), so unlike Word Wrap they
don't route through `App.ts` at all — `MonacoEditor.ts` reads them directly
from settings at editor creation and listens for
`novi-columnbreak-changed`/`novi-showruler-changed` window events for live
updates, the same self-contained pattern already used for Vim mode.

While in `MonacoEditor.ts`, fixed a pre-existing compile blocker
(`vimodeHandler as EventListener` — TS wanted `as unknown as EventListener`
first) that surfaced once a test imported the file directly for the first
time, same pattern as prior fixes this session.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/TitleBar.ts` | Swapped Check for Updates / About Novi order; Word Wrap checkbox `settingDefault` changed to `false` |
| `src/main/menu.ts` | Swapped Check for Updates / About Novi order (native Help submenu) |
| `src/renderer/components/SettingsTab.ts` | Added `wordWrapDefault`/`columnBreakEnabled`/`columnBreakValue`/`columnBreakHard`/`showRulerEnabled` state, loaded at startup; added Word Wrap toggle, `createColumnBreakSection()` (checkbox + `createNumberFieldRow()` + Hard Break sub-toggle), and Show Ruler toggle to `renderEditorSettings()` |
| `src/renderer/components/MonacoEditor.ts` | `wordWrap` default changed `true`→`false`; added `setColumnBreak()`/`setShowRuler()`/`applyRuler()`/`loadEditorPrefs()`/`maybeHardBreak()`; wired `onDidType` and the two new window-event listeners in `initEditor()`; fixed the pre-existing `vimodeHandler` cast |
| `src/renderer/components/App.ts` | `editorWordWrap` default and all three `getSetting('wordwrap', ...)` calls changed to `false`; added `novi-wordwrap-changed` listener mirroring the `singlefiletree`/`gitenabled` pattern |
| `src/tests/core-0.8.0/settings-tab.test.ts` | Extended: verifies all four new controls render off by default, the column field defaults to 90, and each persists + broadcasts its `novi-*-changed` event correctly, including value clamping on the number field |
| `src/tests/core-0.8.0/monaco-editor-column-break.test.ts` | New: exercises the real (unmocked) `setShowRuler`/`setColumnBreak`/`maybeHardBreak` methods against a fake `editor` object — ruler positioning, and hard-break firing only when Column Break + Hard Break are on and Word Wrap is off |

### Test Results
- 49 suites passed, 0 failed (738 tests, 8 new in `monaco-editor-column-break.test.ts` plus extensions to `settings-tab.test.ts`)
- Manually confirmed the Word-Wrap-guard test in `monaco-editor-column-break.test.ts` fails when that guard is removed from `maybeHardBreak()`, then passes again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
