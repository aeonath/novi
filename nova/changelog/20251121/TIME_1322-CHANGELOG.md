# Strip ANSI Codes from PWD — 20251121.1322

## Summary
Fixed PWD parsing to strip ANSI color codes before extracting directory name.

## Files Changed
- src/main/main.ts — Added ANSI code stripping to PWD regex

## Changes Made
1. **Strip ANSI codes**: Added regex `/\x1b\[[0-9;]*m/g` to remove color codes
2. **Clean parsing**: Parse directory from cleaned text instead of raw output
3. **Better regex**: Changed pattern to exclude `:` character as well

## Problem
Tab was showing `💻 0[0m` (ANSI control codes) instead of directory name because the regex was capturing the escape sequences.

## Solution
Before matching the MINGW64 pattern, strip all ANSI escape codes:
- Pattern: `/\x1b\[[0-9;]*m/g` removes color codes like `\x1b[0m`
- Then extract directory from clean text
- Updated regex to `/MINGW64\s+([^\r\n$:]+)/` to stop at `:` prompt

## Reason
User reported tab showing control codes instead of directory name.

## Git Commit Hash
`TBD` - Strip ANSI codes from PWD

## Status
✅ Completed

