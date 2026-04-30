# Changelog — Ad hoc: Replace debug setting with hardcoded constant

**Date**: 20260429.1720  
**Commit**: TBD

---

## Summary

Removed `debug` from the persisted user settings system and the Novi Shell REPL. Debug mode is now a hardcoded `const DEBUG = false` in both process entry points. Flip it to `true` locally when you need verbose console output.

## Files Changed

| File | Change |
|------|--------|
| `src/main/main.ts` | Replace `getSetting('debug')` load with `const DEBUG = false`; remove `key === 'debug'` handler from set-setting IPC |
| `src/renderer/index.ts` | Replace async settings load + `novi-debug-changed` event listener with `const DEBUG = false` applied synchronously |
| `src/renderer/components/NoviShell.ts` | Remove `debug` from settings display, valid options list, error message, and event map |

## Test Results

666/666 passing — no regressions.
