# Changelog — 2026-03-05 02:38

## Sprint 7 Task 6: Add `debug on/off` setting

### Summary
Added a persistent `debug` setting that controls verbose `console.log` and `console.info` output in the renderer JavaScript console. When debug is off (the default), these calls become no-ops, producing clean console output for production. `console.warn` and `console.error` always remain active. The setting is toggled via `set debug on|off` in Novi Shell and persists across app restarts.

### Changes

| File | Change |
|------|--------|
| `src/renderer/index.tsx` | Added debug logging gate: stores original `console.log`/`console.info`, overrides them based on the `debug` setting loaded at startup. Listens for `novi-debug-changed` events for runtime toggling. Updated version string to 0.7.0. |
| `src/renderer/components/NoviShell.tsx` | Added `debug` to the settings whitelist, display list, single-setting getter, and setter (dispatches `novi-debug-changed` event). |

### Rationale
Production builds should not flood the JavaScript console with verbose debug output. Rather than editing 278 individual `console.log` calls across 17 renderer files, the approach overrides `console.log` and `console.info` at the entry point to be conditional on the debug flag.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
