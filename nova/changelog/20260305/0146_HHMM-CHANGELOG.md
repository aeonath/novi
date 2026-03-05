# Changelog — 2026-03-05 01:46

## Ad hoc: Fix welcome screen flash on startup

### Summary
The old welcome screen ("Novi - Open a file to start editing") briefly flashed on startup before the Home terminal loaded. Fixed by initializing `showWelcome` to `false` instead of `true`.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | Changed `useState(true)` to `useState(false)` for `showWelcome` initial state |

### Test Results
- **605 tests passed**, 0 failed

### Commit Hash
TBD
