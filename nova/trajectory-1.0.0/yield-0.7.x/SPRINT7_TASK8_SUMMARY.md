# Sprint 7 — Task 8 Summary: Add savestate on/off Setting

## Objective
Make workspace state persistence configurable via `set savestate on/off` in Novi Shell.

## Checklist
- [x] `savestate` added to NoviShell settings whitelist (default: on)
- [x] `savestate` shown in `set` (all settings display)
- [x] `set savestate` shows current value
- [x] `set savestate on|off` persists setting
- [x] Workspace load skipped when savestate is off
- [x] Workspace save skipped when savestate is off
- [x] All 620 tests pass
- [x] Build compiles without errors

## Files Changed
1. `src/renderer/components/NoviShell.tsx` — Added `savestate` to commandSet settings
2. `src/renderer/components/App.tsx` — Gated workspace save/load on `savestate` setting

## Test Results
- 33 test suites, 620 tests — all passing
