# Sprint 7 Task 1 — Command interception: #novi instead of novi — 20260214.1148

## Summary
Terminal command interception now uses **#novi** (with optional leading whitespace) instead of **novi**, so the shell treats the line as a comment and does not execute a `novi` binary. Only lines that **begin** with optional whitespace then `#novi` are recognized; e.g. `echo #novi` does not trigger the editor.

## Reason
SPRINT7_PLAN.md Task 1: avoid collisions in bash when a `novi` command exists in PATH; use `#novi` so the shell ignores the line. Requirement: command must begin with `#novi` (optional leading whitespace); `echo #novi` must not evoke the editor.

## Files Changed

### Modified
- **src/renderer/utils/novi-command.ts**
  - Parser now matches `#novi` instead of `novi`. After trim, line must be exactly `#novi` or start with `#novi ` (space).
  - Arg for open/settings/shell is taken after `#novi` (slice from index 5). `#novi -s`, `#novi -c`, `#novi <path>` unchanged in behavior.
  - JSDoc updated: command must begin with #novi; echo #novi must not trigger.
- **src/renderer/components/App.tsx**
  - Terminal line handling: no longer searches for `novi` in the middle of the line. Only invokes `parseNoviCommand` when the trimmed line starts with `#novi` (`trimmedLine.startsWith('#novi')`). Ensures `echo #novi` and `foo #novi myfile.md` return handled: false.
- **src/tests/core-0.6.0/novi-command.test.ts**
  - All expectations updated from `novi` to `#novi`. Added tests: `echo #novi` → handled: false, `echo #novi myfile.md` → handled: false, `foo #novi` → handled: false, `#novi myfile.md` → open path. Leading/trailing whitespace tests now use `#novi`.

## Implementation details
- **Pattern**: Effectively `^\s*#novi` — optional leading whitespace, then `#novi`, then optional rest (space + args). Parser receives already-trimmed line in App; parser trims again and requires `s === '#novi' || s.startsWith('#novi ')`.
- **Critical**: Lines like `echo #novi` or `something #novi file.md` do not start with `#novi` after trim, so they are never passed to the handler and never trigger open/settings/shell.

## User-facing impact
- In integrated terminal (PTY), users must type **#novi** (e.g. `#novi myfile.md`, `#novi -s`, `#novi -c`) instead of `novi`. Leading spaces are still allowed (`   #novi file.md`).
- Bash will treat the line as a comment, so no collision with a `novi` binary in PATH.
- `echo #novi` and similar no longer open the editor.

## Test results
- `npm test` (all unit tests): 31 suites, 591 tests passed.

## Git Commit Hash
`TBD` — Sprint7 Task1: #novi command interception

## Status
✅ Completed
