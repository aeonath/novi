# Sprint 6 Task 8 — Task Summary

## Task objective (from SPRINT6_PLAN)
Implement the novi terminal command: when on a terminal tab, intercept commands that start with `novi` — open file in editor (`novi myfile.py`), show set options (`novi -s`), open/focus Novi Shell (`novi -c`); `novi` with no arguments reserved for future use.

## Requirements checklist
- ✅ **novi &lt;file&gt;** — Intercept and open the file in the Monaco editor (or image tab for images).
- ✅ **novi -s** — Display current Novi Shell set options in the terminal.
- ✅ **novi -c** — Open Novi Shell tab or switch focus to it if already open.
- ✅ **novi** (no args) — No-op; reserved for future.

## Key accomplishments
- Line-buffered terminal input so only complete lines are inspected for `novi`; non-novi lines are sent to the PTY unchanged.
- Extracted `parseNoviCommand()` into `src/renderer/utils/novi-command.ts` for testability and clarity.
- Path resolution for `novi <path>` uses the terminal’s CWD; supports relative and absolute paths.
- Unit tests added for the novi command parser (core-0.6.0).

## Files created
- `src/renderer/utils/novi-command.ts`
- `src/tests/core-0.6.0/novi-command.test.ts`

## Files modified
- `src/renderer/components/App.tsx`

## Test results
- **Pass**: 31 test suites, 590 tests (including 6 new in novi-command.test.ts).

## Status
✅ Completed

## Reference
Detailed changelog: `nova/changelog/20260213/TIME_1631-CHANGELOG.md`
