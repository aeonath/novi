# Changelog — 20260228.1953

## Summary

Fixed vim/TUI cursor corruption by switching CWD tracking from `echo` + regex
stripping to OSC 7 (invisible escape sequence), matching mira-terminal's approach.

## Root Cause

The old `PROMPT_COMMAND='echo "__NOVA_PWD__:$(pwd)"'` produced visible text that
was regex-stripped from the PTY data stream. On Windows, ConPTY wraps this echo
output in cursor positioning escape sequences. The regex only stripped the marker
text, leaving orphaned cursor movement sequences that corrupted the display after
exiting vim or other TUI applications.

## Fix

Replaced the `echo` + regex-strip approach with OSC 7 (`printf "\033]7;..."`)
— a standard terminal escape sequence that xterm.js silently consumes. No data
stripping needed, no orphaned sequences, clean data pipeline.

## Files Changed

| File | Change |
|------|--------|
| `src/main/services/terminal-service.ts` | PROMPT_COMMAND: `echo` → OSC 7 `printf` |
| `src/main/main.ts` | PWD parser: `__NOVA_PWD__` regex → OSC 7 regex; removed data stripping |

## Test Results

- 31 suites, 591 tests — **all passing**

## Commit

`TBD`
