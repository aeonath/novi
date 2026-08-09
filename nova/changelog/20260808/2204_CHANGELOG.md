# Changelog — 2026-08-08 22:04

## Ad hoc: Gray out Close File on the terminal tab

### Summary
`App.onCloseFile()` already only ever acted on a `'file'`-type tab (a
silent no-op otherwise), so the fix is a pure UX/menu-state correction:
`Close File` now grays out whenever the active tab isn't a file tab
(terminal, settings, image, or none), reusing the exact same
`tabType !== 'file'` rule the `command-palette` entry already used. New
File and Open File are unaffected — they apply regardless of the active
tab and stay enabled everywhere, per the request.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/TitleBar.ts` | Added `'close-file'` to `EDITOR_ONLY_COMMANDS` (renamed intent via comment — same array/rule `command-palette` already used) |
| `src/tests/core-0.8.0/titlebar-file-menu.test.ts` | New: verifies Close File is grayed on a terminal tab and with no tab active, enabled on a file tab, and that New File / Open File stay enabled in all three cases |

### Test Results
- 48 suites passed, 0 failed (724 tests, 3 new)
- Manually confirmed 2 of the 3 new tests fail when `close-file` is removed from `EDITOR_ONLY_COMMANDS`, then pass again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
