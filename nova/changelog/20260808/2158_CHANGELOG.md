# Changelog — 2026-08-08 21:58

## Ad hoc: Implement View menu commands and per-tab/panel enable/disable state

### Summary
Implemented the View menu's Toggle Word Wrap and Toggle Line Numbers for
the editor (both were previously no-ops — `case 'toggle-word-wrap': case
'toggle-line-numbers': break;`), wired proper graying rules for the whole
View menu, and made Show Hidden Files aware of when the file tree isn't
actually visible.

- **Terminal tab**: Toggle Word Wrap and Toggle Line Numbers are grayed out
  (neither concept applies to a terminal). Increase/Decrease/Reset Font
  Size were already wired to the terminal's own font size and needed no
  change — confirmed still correctly enabled.
- **Editor tab**: Toggle Word Wrap now actually wraps, at a fixed column of
  90 (Monaco's `wordWrap: 'wordWrapColumn', wordWrapColumn: 90`, replacing
  the previous unconditional viewport-based `wordWrap: 'on'`). Toggle Line
  Numbers now actually toggles, defaulting to on (matching the existing
  hardcoded `lineNumbers: 'on'` this replaces). Both are checkbox menu
  items now (matching Show Hidden Files' existing pattern), persisted via
  `wordwrap`/`linenumbers` settings and loaded at startup alongside
  `fontSize`/`terminalFontSize`. Font size commands already worked here too.
- **Show Hidden Files**: now grayed out whenever the file tree isn't
  actually visible in the sidebar — previously only checked "is the
  Settings tab active," missing the case where the Git panel has replaced
  the file tree (`App.updateSidebarVisibility()`'s existing
  `showGitPanel || isSettings` condition). `TitleBar` had no visibility
  into `showGitPanel` at all before this; added it to `TitleBarConfig` and
  synced it from `updateSidebarVisibility()` — the single place `App.ts`
  already recomputes sidebar visibility on every tab switch and panel
  toggle, so it can't drift out of sync.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/MonacoEditor.ts` | `wordWrap` config/setter changed from `'on'\|'off'` (viewport-based) to `boolean` (column-90-based via new `WORD_WRAP_COLUMN = 90` constant); added `lineNumbers` config/setter; editor-creation options now read both from instance state instead of hardcoded values |
| `src/renderer/components/App.ts` | Added `editorWordWrap`/`editorLineNumbers` state, loaded from settings at startup and passed to `MonacoEditor`'s constructor; implemented the `toggle-word-wrap`/`toggle-line-numbers` menu-command cases (read the freshly-persisted setting TitleBar's checkbox click already saved, apply it to Monaco); `updateSidebarVisibility()` now syncs `showGitPanel` into `TitleBar`'s config |
| `src/renderer/components/TitleBar.ts` | Added `showGitPanel` to `TitleBarConfig`; made Toggle Word Wrap/Line Numbers checkbox items (`wordwrap`/`linenumbers` setting keys, default `true`); added `EDITOR_ONLY_VIEW_COMMANDS` graying rule; Show Hidden Files' disabled condition now also checks `showGitPanel`, not just the Settings tab |
| `src/tests/core-0.8.0/titlebar-view-menu.test.ts` | New: verifies Toggle Word Wrap/Line Numbers grayed on a terminal tab but enabled on a file tab, font-size commands stay enabled on both, and Show Hidden Files grays out both when the Git panel is showing and on the Settings tab |

### Test Results
- 47 suites passed, 0 failed (721 tests, 8 new)
- Manually confirmed 2 of the 8 new tests fail when the Git-panel-awareness and editor-only-view-commands rules are removed, then pass again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
