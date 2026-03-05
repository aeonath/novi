# Changelog — 2026-03-05 02:48

## Sprint 7 Task 7: Apply debug flag to terminal (main process) log messages

### Summary
Extended the `debug on/off` setting (added in Task 6 for the renderer) to also control verbose `console.log` and `console.info` output in the main (Node.js) process. When Novi is launched from a terminal, these messages appear in stdout. With debug off (default), they are suppressed. `console.warn` and `console.error` always remain active. The setting is read synchronously at main process startup and updated in real-time when changed via `set debug on/off` in Novi Shell.

### Changes

| File | Change |
|------|--------|
| `src/main/main.ts` | Added debug logging gate: stores original `console.log`/`console.info`, overrides them based on the `debug` setting loaded synchronously at startup. Hooked into `set-setting` IPC handler to apply debug mode changes in real-time when the renderer persists the setting. |

### Rationale
53 `console.log`/`console.info` calls across 10 main-process files produce verbose terminal output when Novi is launched from a command line. Instead of editing each call individually, the same override pattern from Task 6 is applied at the main process entry point.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
