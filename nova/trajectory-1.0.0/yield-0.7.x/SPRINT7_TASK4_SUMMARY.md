# Sprint 7 — Task 4 Summary: The Git Button

## Objective
Hide the Git button when `.git` doesn't exist in the directory, and remove auto-staging code.

## Checklist
- [x] Git button only shows when `.git` directory exists in the file tree root
- [x] Git button hidden for non-repository directories
- [x] Auto-staging code removed from GitPanel
- [x] `explicitlyUnstagedFiles` state cleaned up (only existed for auto-staging)
- [x] Manual stage/unstage still works via + and - buttons
- [x] All 620 tests pass
- [x] Build compiles without errors

## Files Changed
1. `src/renderer/components/FileTree.tsx` — Git button conditional on `.git` in tree entries
2. `src/renderer/components/GitPanel.tsx` — Removed auto-staging useEffect and related state

## Test Results
- 33 test suites, 620 tests — all passing
