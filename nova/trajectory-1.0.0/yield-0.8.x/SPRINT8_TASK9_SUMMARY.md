# Sprint 8 — Step 9 Task Summary: novi-command Tests

**Date**: 2026-04-29  
**Status**: COMPLETE

---

## Objective

Write and fix the test suite for the Novi CLI command implementation (`NOVI_COMMAND_PLAN.md` Step 9). The test file already existed but had 3 failing tests in the `CliService.start` suite.

## Problem

`jest.spyOn(fs, 'mkdirSync')` threw `TypeError: Cannot redefine property: mkdirSync` in Jest's jsdom environment. Node.js built-in module exports are non-configurable properties, so Jest cannot replace them via `spyOn` without first making them mockable.

## Fix

Added `jest.mock('fs')` and `jest.mock('net')` to `src/tests/core-0.8.0/novi-command.test.ts`. Jest hoists these calls before imports, replacing the built-in modules with auto-mocked versions whose properties are fully configurable. All `jest.spyOn` calls in the `CliService.start` suite then work correctly.

## Checklist

- [x] `jest.mock('fs')` and `jest.mock('net')` added to test file
- [x] All 28 tests in `novi-command.test.ts` pass
- [x] Full suite: 666/666 passing (40 suites)
- [x] No regressions introduced

## Files

| File | Change |
|------|--------|
| `src/tests/core-0.8.0/novi-command.test.ts` | Added `jest.mock('fs')` and `jest.mock('net')` (2 lines) |

## Test Counts

- This test file: **28 tests** across 6 describe blocks
- Full test suite: **666 tests** — all passing
