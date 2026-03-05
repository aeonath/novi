# Changelog — 2026-03-05 01:34

## Ad hoc: Home terminal exit closes the app

### Summary
When the Home terminal shell exits (e.g. user types `exit`), the entire app now closes instead of leaving the tab open with a dead shell.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | Changed Home terminal exit handler to call `window.api.quit()` instead of keeping the tab open |

### Test Results
- **605 tests passed**, 0 failed

### Commit Hash
TBD
