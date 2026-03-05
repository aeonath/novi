# Changelog — 2026-03-05 01:21

## Sprint 7 Task 2: Permanent Home Terminal Tab

### Summary
Transformed Novi into a terminal-first environment by adding a permanent Home terminal tab that is always in the first position, always open, and cannot be closed.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | Added `HOME_TERMINAL_ID` constant and `homeTerminalPinnedSet`; created Home terminal on startup (always position 0); updated home button to switch to Home terminal; prevented Home terminal from being closed or removed on exit; updated PWD listener to use home icon; excluded Home terminal from workspace save; updated `onAllTabsClosed` to switch to Home terminal |
| `src/renderer/components/TabBar.tsx` | Added `pinnedTabIds` prop and `isPinned` to `TabItemProps`; pinned tabs hide the close button and refuse removal via `removeTab` |
| `src/renderer/components/StatusBar.tsx` | Updated home button tooltip from "Show home screen" to "Go to Home terminal" |
| `src/main/services/terminal-service.ts` | Changed fallback CWD from `process.cwd()` to `os.homedir()` so the Home terminal starts in user's home directory |

### Rationale
The app is transitioning to be the Novi Terminal Environment. A permanent Home terminal ensures users always have a terminal available and establishes the terminal-first paradigm.

### Test Results
- **605 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
