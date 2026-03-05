# Changelog — 2026-03-05 02:50

## Ad hoc: Refresh git status when terminal CWD changes

### Summary
The git branch name in the FileTree status bar was stale after changing directories in a terminal. When navigating to a non-repo directory (e.g. `C:\Work`), the branch badge from the previous repo directory persisted because the terminal PWD listener only updated the file tree root and tab title — it never refreshed the git status.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | Added `gitGetStatus` call in the `terminalOnPwd` callback to refresh git status whenever the terminal CWD changes. Clears git status (`null`) when the new directory is not a git repo. |

### Rationale
The git status bar should reflect the current directory. Without this fix, navigating away from a git repo left stale branch/ahead/behind information displayed.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
