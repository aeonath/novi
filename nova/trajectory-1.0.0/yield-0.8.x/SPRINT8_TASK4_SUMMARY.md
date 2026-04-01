# Sprint 8 — Task 4 Summary: Change Default App Behaviour

**Date:** 2026-04-01  
**Branch:** dev-core

## Objectives

- Remove the pinned "home terminal" concept — all terminals are now regular closeable tabs
- Auto-open a terminal on startup ONLY if there are no terminals from the previous session
- Closing all tabs shows the home screen (welcome screen)
- Home button navigates to the home screen instead of the home terminal
- Closing a terminal no longer triggers an app-exit confirmation dialog

## Checklist

- [x] Remove `HOME_TERMINAL_ID` constant and `homeTerminalPinnedSet`
- [x] Remove `pinnedTabIds` from TabBar config — terminal tabs now have a close (X) button
- [x] `onAllTabsClosed` callback now shows welcome screen instead of switching to home terminal
- [x] Home button click now shows welcome screen instead of switching to home terminal
- [x] Remove exit-confirm dialog (`showExitConfirmDialog`, `hideExitConfirmDialog`, `exitConfirmOverlay`)
- [x] Remove `restartDeadHomeTerminal()` — no longer needed
- [x] Terminal exit handler: all terminals close their tab on PTY exit (no special home terminal branch)
- [x] `recreateHomeTerminal()` updated to restart the first open terminal (shell-change support)
- [x] `createHomeTerminal()` renamed to `createInitialTerminal()` — creates a regular timestamped tab
- [x] `loadWorkspace()`: only creates initial terminal if no saved terminals exist
- [x] `loadWorkspace()`: focuses first restored terminal when session had terminals
- [x] `saveWorkspace()`: saves ALL open terminals (no HOME_TERMINAL_ID filter); removed `homeTerminalCwd`
- [x] `resetWorkspace()`: closes ALL tabs and shows home screen
- [x] `onTabClose()`: removed guard that blocked home terminal closure
- [x] PWD handler: all terminals use same 💻 icon (removed HOME_TERMINAL_ID-specific icon)
- [x] Welcome screen text updated to "Open a terminal or file to get started"
- [x] StatusBar home button tooltip updated to "Go to home screen"
- [x] All 638 tests pass, 0 failed
- [x] Build compiles without errors

## Files Changed

| File | Action |
|------|--------|
| `src/renderer/components/App.ts` | Modified |
| `src/renderer/components/StatusBar.ts` | Modified |

## Tests

- 39 suites, 638 tests passed, 0 failed
