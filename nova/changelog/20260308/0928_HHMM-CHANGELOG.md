# Changelog — 20260308.0928

## Summary
Fixed blank home terminal after clicking "No" on the exit confirmation dialog. The dialog was calling `recreateHomeTerminal()` which tries to kill the PTY first, but the PTY was already dead (user typed `exit`). This caused `__restartingTerminalId` to be set but never cleared, and the terminal to not properly reinitialize.

## Files Changed
- `src/renderer/components/App.ts` — Added `restartDeadHomeTerminal()` method that skips the `terminalKill` step and directly cleans up the old instance and creates a fresh one; exit confirm "No" button now calls this instead of `recreateHomeTerminal()`

## Rationale
`recreateHomeTerminal()` was designed for the shell-switch case where the PTY is still running. In the exit confirmation flow, the PTY has already exited, so killing it is a no-op that leaves stale state (`__restartingTerminalId`). The new method handles the "already dead" case cleanly.

## Test Results
- Build: ✅ Passes
- Tests: 642 passed, 4 failed (pre-existing)

## Commit Hash
TBD
