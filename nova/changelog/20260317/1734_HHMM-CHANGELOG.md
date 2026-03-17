# Changelog — 20260317.1734

## Ad hoc: Fix duplicate terminal prompts on startup

### Summary
Fixed a bug where the terminal prompt was drawn multiple times (3x on home terminal, 2x on restored terminals) every time Novi was opened. The root cause was a re-entrancy bug in `Terminal.initPhase1()` — the async method had no guard against concurrent invocations, and during workspace restoration `syncTerminalActiveState()` was called multiple times before the first invocation completed, creating multiple orphaned PTY processes that all forwarded shell output to the same terminal.

### Files Changed
- **src/renderer/components/Terminal.ts** — Added `initInProgress` flag to prevent concurrent `initPhase1()` calls; moved ResizeObserver setup inside RAF callback to avoid startup race; added `initDisplay()` method for restart-while-hidden case; added dimension-change guard to persistent ResizeObserver
- **src/main/services/terminal-service.ts** — Added same-dimension guard in `resizeTerminal()` to skip unnecessary SIGWINCH
- **src/renderer/components/App.ts** — Added `clearEarlyTerminalData()` method for discarding stale terminal buffers
- **package.json** — Version bump 0.8.3 → 0.8.4

### Test Results
- All 638 tests passing
- Build compiles cleanly

### Commit Hash
TBD
