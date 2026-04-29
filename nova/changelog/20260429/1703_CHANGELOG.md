# Changelog — Sprint8 Step9: novi-command tests

**Date**: 20260429.1703  
**Sprint**: Sprint 8 (yield-0.8.x)  
**Commit**: TBD

---

## Summary

Completed Step 9 of `NOVI_COMMAND_PLAN.md` — the test suite for the Novi CLI command implementation. The test file was half-written; three tests in `CliService.start` were failing because `jest.spyOn` cannot redefine non-configurable properties on Node.js built-in modules (`fs`, `net`).

## Files Changed

| File | Change |
|------|--------|
| `src/tests/core-0.8.0/novi-command.test.ts` | Added `jest.mock('fs')` and `jest.mock('net')` to make built-in module properties spyable |

## Root Cause

`jest.spyOn(fs, 'mkdirSync')` threw `TypeError: Cannot redefine property: mkdirSync` because Node.js built-in module exports are non-configurable properties. Adding `jest.mock('fs')` and `jest.mock('net')` at module level causes Jest to replace these with auto-mocked versions whose properties are configurable, allowing `jest.spyOn` to work correctly.

## Test Results

- **Before**: 25/28 passing (3 failures in `CliService.start`)
- **After**: 28/28 passing
- **Full suite**: 666/666 passing across 40 test suites

## Test Coverage (novi-command.test.ts)

| Suite | Tests |
|-------|-------|
| `getPipePath` | Returns correct socket path |
| `parseCliModeArgs` | new-file, open-terminal, relative path resolution, absolute path |
| `parseStartupArgs` | all flag combinations including --novi-cli suppression |
| `CliService.handleCommand` | ping, new-file, open-file, open-terminal, null window, destroyed window, unknown command |
| `CliService.start` | .novi dir creation, server listen, stale socket removal |
| Renderer CLI methods | openFileFromPath (dedup + new), createTerminalTab (with/without cwd), createNewFileTab (single + counter) |
