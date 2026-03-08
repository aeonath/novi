# Changelog — 20260308.0924

## Summary
Disabled the "Show Hidden Files" menu item when the settings tab is active, since there is no file tree to toggle.

## Files Changed
- `src/renderer/components/TitleBar.ts` — Added `SETTINGS_DISABLED_COMMANDS` array containing `show-hidden-files`; added condition to gray it out when `tabType === 'settings'`

## Rationale
The show hidden files toggle is irrelevant when viewing the settings tab and should be visually disabled to avoid confusion.

## Test Results
- Build: ✅ Passes
- Tests: 642 passed, 4 failed (pre-existing)

## Commit Hash
TBD
