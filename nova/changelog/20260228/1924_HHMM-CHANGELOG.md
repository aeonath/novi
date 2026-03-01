# Changelog — 20260228.1924

## Summary

Fixed vim (and other TUI applications) cursor restoration bug in Novi terminal.
After exiting vim, the cursor was not restored to its original position and text
was overwritten at the bottom of the screen.

## Root Cause

The xterm.js `convertEol: true` option was converting bare `\n` (LF) to `\r\n`
(CRLF). TUI applications like vim send raw `\n` for cursor-down movements
without returning to column 0, but `convertEol` injected extra `\r` characters
that forced the cursor to column 0, corrupting cursor positioning and preventing
proper alternate-screen-buffer restoration on exit.

Since Novi uses a real PTY (node-pty with conpty on Windows), the PTY already
handles line ending conversion at the OS level — `convertEol` was not needed.

## Fix

Removed `convertEol: true` from both xterm instances in Terminal.tsx:
- Temporary measurement terminal (Phase 1)
- Actual display terminal (Phase 2)

This aligns Novi's terminal with the working mira-terminal VSCode extension
implementation.

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.tsx` | Removed `convertEol: true` from both xterm configs; added explanatory comment |

## Test Results

- 31 suites, 591 tests — **all passing**

## Commit

`TBD`
