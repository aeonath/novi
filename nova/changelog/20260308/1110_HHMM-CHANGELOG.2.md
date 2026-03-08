# Changelog — 20260308.1110

## Ad hoc: Fix spurious "Terminal terminal-home not found" errors on startup

### Problem
Two `[ERROR] Terminal terminal-home not found` messages appeared in logs at startup. The ResizeObserver on the terminal container was forwarding resize IPC calls to the main process even after the PTY had exited (or before it was created), causing the terminal service to log errors for a non-existent session.

### Root Cause
The `onResize` callback in Terminal's ResizeObserver and tab-switch refit did not check whether the PTY was still alive. After a PTY exits, the session is deleted from the main process, but the renderer's ResizeObserver kept firing resize events.

### Fix
- **Terminal.ts**: Added `markPtyExited()` method that sets `ptyCreated = false`. Guarded all `onResize` callbacks (ResizeObserver + tab-switch refit) with `this.ptyCreated` check so resize IPC is only sent when a PTY actually exists.
- **App.ts**: Call `markPtyExited()` on the Terminal instance in the `terminal-exit` handler, before any other exit logic.

### Files Changed
- `src/renderer/components/Terminal.ts` — `markPtyExited()`, guarded resize callbacks
- `src/renderer/components/App.ts` — call `markPtyExited()` on terminal exit

### Test Results
- 37 suites passed, 642 tests passed
- 2 pre-existing environment-specific failures (extension-loader, installer) unrelated to this change

### Commit Hash
TBD
