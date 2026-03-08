# Changelog — 20260308.1110

## Ad hoc: Fix blank home terminal after exit confirmation "No" (take 2)

### Problem
Previous attempts to fix the "exit → No" flow overcomplicated the solution by disposing and recreating the xterm instance, which caused the terminal to go blank/lock. The home terminal's xterm and Terminal component should never be destroyed — only the shell process (PTY/bash) needs to be respawned.

### Root Cause
`restartAfterExit()` was disposing the xterm, nulling out the terminal and fitAddon, resetting all flags, and then trying to recreate everything from scratch via `initPhase2()`. This async chain could fail or hang, leaving a blank tab.

### Fix
- **Terminal.ts**: Replaced `restartAfterExit()` with `respawnShell()`. The new method keeps the existing xterm alive — it just calls `terminal.reset()` to clear the screen, then creates a new PTY via `terminalCreate` IPC. The new PTY's output flows through the existing `__terminalAPI` write function to the existing xterm. No xterm disposal, no component recreation.
- **App.ts `restartDeadHomeTerminal()`**: Updated to call `respawnShell()` instead of `restartAfterExit()`.

### Files Changed
- `src/renderer/components/Terminal.ts` — replaced `restartAfterExit()` with `respawnShell()`
- `src/renderer/components/App.ts` — `restartDeadHomeTerminal()` calls `respawnShell()`

### Test Results
- 37 suites passed, 642 tests passed
- 2 pre-existing environment-specific failures (extension-loader, installer) unrelated to this change

### Commit Hash
TBD
