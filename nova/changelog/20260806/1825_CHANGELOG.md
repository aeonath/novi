# Changelog — 2026-08-06 18:25

## Ad Hoc — Add -h/--help support to buildit.sh

### Summary
`buildit.sh -h` and `buildit.sh --help` previously fell through to the `case` statement's
default branch and were treated as an unknown build target (`Unknown target: -h`, exit 1)
instead of showing usage. Running with no arguments already printed usage and exited 0; the
help flags now do the same, and the "unknown target" error path reuses the same usage text
instead of a separate, shorter duplicate.

### Files Changed

| File | Change |
|------|--------|
| `buildit.sh` | Extracted usage text into a `print_usage()` function; `-h`/`--help` (and no-arg) now print usage and exit 0 before any build steps run; the unknown-target error path calls `print_usage()` instead of duplicating a shorter usage line |

### Test Results
- 659 tests passed, 0 failed (39 suites) — `npm test` (no TS changes; run for consistency)
- Manually verified: `./buildit.sh -h`, `./buildit.sh --help`, `./buildit.sh` (no args) all print usage and exit 0; `./buildit.sh bogus` still errors with exit 1

### Commit
TBD
