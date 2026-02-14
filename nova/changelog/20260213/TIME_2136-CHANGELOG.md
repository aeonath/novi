# Ad hoc — Allow whitespace before/around novi command in terminal — 20260213.2136

## Summary
Terminal lines like `$        novi        filename.md` (leading whitespace before "novi" and multiple spaces between "novi" and the path) are now accepted. The parser trims the command string and normalizes the path argument so open/settings/shell commands work the same.

## Reason
User requested: if there is any whitespace before the novi command on the terminal allow that so it could be `$        novi        filename.md`.

## Files Changed

### Created
- **nova/changelog/20260213/TIME_2136-CHANGELOG.md** — This file.

### Modified
- **src/renderer/utils/novi-command.ts**
  - At the start of `parseNoviCommand`, set `const s = trimmed.trim()` and use `s` for all checks and for `arg = s.slice(4).trim()`, so leading/trailing whitespace and multiple spaces between "novi" and the path are accepted.
  - Updated JSDoc to note that leading/trailing whitespace is allowed.
- **src/renderer/components/App.tsx**
  - Comment updated: line may have leading whitespace or prompt (e.g. `$        novi        filename.md`); extraction from first "novi" is unchanged.
- **src/tests/core-0.6.0/novi-command.test.ts**
  - New test: "allows leading and trailing whitespace" for `"   novi   filename.md"`, `"  novi -s  "`, and `"  novi  "`.

## User-facing impact
- Commands such as `    novi    file.md` or `$        novi        filename.md` (with prompt) open the file or run -s/-c as expected.

## Git Commit Hash
`TBD` — Ad hoc: allow whitespace before/around novi command

## Status
✅ Completed
