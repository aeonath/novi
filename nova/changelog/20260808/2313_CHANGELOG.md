# Changelog — 2026-08-08 23:13

## Ad hoc: Gray out Hard Break when Word Wrap is on; Word Wrap honors Column Break

### Summary
Two related fixes to the editor settings added earlier tonight.

**UI**: `Hard Break` is grayed out with "(disabled)" appended to its label
whenever `Word Wrap` is on, since Hard Break is a no-op in that state
(`maybeHardBreak()` already checked `!this._wordWrap`, but nothing in the
UI reflected that). Extended `createToggleRow()` with an optional
`disabled` parameter: when true, it dims the row (`opacity: 0.5`), sets the
checkbox's native `disabled` attribute, skips attaching the hover/click/
change listeners entirely (not just visually — actually inert), and
appends " (disabled)" to the label. Word Wrap's own toggle now calls
`this.render()` after persisting, so Hard Break's disabled state updates
live the moment Word Wrap is flipped.

**Behavior**: Word Wrap's wrap column now follows Column Break's value
whenever Column Break is enabled, instead of always using the fixed
90-column default. Added `MonacoEditor.effectiveWrapColumn()`
(`columnBreakEnabled ? columnBreakValue : WORD_WRAP_COLUMN`), used by the
`wordWrap` setter, the editor-creation options, and reapplied live from
both `setColumnBreak()` (so changing the column while wrap is already on
re-wraps immediately) and `loadEditorPrefs()` (so the async settings load
racing editor creation doesn't leave a stale 90-column wrap if Column
Break turns out to be enabled with a different value).

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/SettingsTab.ts` | `createToggleRow()` gained a `disabled` parameter (dims the row, disables the checkbox, skips its listeners, appends "(disabled)" to the label); Hard Break's call site now passes `this.wordWrapDefault`; Word Wrap's `onChange` now calls `this.render()` |
| `src/renderer/components/MonacoEditor.ts` | Added `effectiveWrapColumn()`; `wordWrap` setter, editor-creation options, `setColumnBreak()`, and `loadEditorPrefs()` all use/reapply it instead of the fixed `WORD_WRAP_COLUMN` constant |
| `src/tests/core-0.8.0/settings-tab.test.ts` | Added: Hard Break shows "(disabled)" and its checkbox is truly inert once Word Wrap is on; stays enabled/unlabeled while Word Wrap is off |
| `src/tests/core-0.8.0/monaco-editor-column-break.test.ts` | Added a "Word Wrap honors Column Break" suite: wraps at 90 by default, wraps at the Column Break value once enabled, re-wraps live on a column change, and reverts to 90 when Column Break is disabled again |

### Test Results
- 49 suites passed, 0 failed (744 tests, 6 new)
- Manually confirmed the 2 new `effectiveWrapColumn`-dependent tests fail when that method is hardcoded to always return 90, then pass again with the fix restored
- Manually confirmed the new "(disabled)" test fails when Hard Break's `disabled` argument is hardcoded to `false`, then passes again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
