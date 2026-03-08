# Changelog — 20260308.0832.2

## Summary
Fixed file tree not loading on startup in multi-tree mode (the default). The home terminal's first OSC 7 CWD report was consumed by the pending-cd-restore logic but never forwarded to the renderer when the paths already matched, leaving the file tree stuck in loading state.

## Files Changed
- `src/main/main.ts` — Added `else` branch in the `pendingCdRestore` path-match case to send `terminal-pwd` to the renderer when no `cd` injection is needed

## Rationale
When the workspace restores and the shell's initial CWD matches the saved CWD, the first OSC 7 was silently consumed without notifying the renderer. The file tree relies on `terminal-pwd` to clear its loading state and display the directory contents.

## Test Results
- Build: ✅ Passes
- Tests: 642 passed, 4 failed (pre-existing failures in extension-loader and installer tests)

## Commit Hash
TBD
