# Changelog — 20260308.1034

## Ad hoc: Fix blank/locked home terminal after exit confirmation "No"

### Problem
When the user typed `exit` in the home terminal and clicked "No" on the exit confirmation dialog, the home terminal tab became blank and locked. The terminal was not properly reinitialized.

### Root Cause
`restartDeadHomeTerminal()` previously destroyed the Terminal component and recreated it via `syncTerminalInstances()`, which triggered the full async `initPhase1` flow (ResizeObserver wait, temp xterm measurement). This async chain could hang or fail silently, leaving a blank tab. The method also didn't switch the active tab or update content visibility.

### Fix
- **Terminal.ts**: Added `restartAfterExit()` method for dead-terminal restarts. Synchronously disposes old xterm, then creates new PTY via a single `.then()` callback that builds a fresh xterm on completion. No kill needed (PTY already dead), no ResizeObserver wait (reuses saved dimensions), errors are caught and logged.
- **App.ts `restartDeadHomeTerminal()`**: Switches to the home terminal tab via `setActiveTab()` (handles all visibility updates), then calls `restartAfterExit()` on the existing Terminal instance.

### Files Changed
- `src/renderer/components/App.ts` — `restartDeadHomeTerminal()` method
- `src/renderer/components/Terminal.ts` — new `restartAfterExit()` method

### Test Results
- 37 suites passed, 642 tests passed
- 2 pre-existing environment-specific failures (extension-loader, installer) unrelated to this change

### Commit Hash
TBD
