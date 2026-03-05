# Changelog — 2026-03-05 02:16

## Sprint 7 Task 4: Git button visibility and auto-staging removal

### Summary
The Git toggle button in the file tree header now only appears when `.git` exists in the current directory (checked from the loaded tree entries). Previously it showed on all directories regardless. Also removed the auto-staging code that automatically staged all unstaged files when the Git panel was open.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/FileTree.tsx` | Git toggle button now checks `tree.some(n => n.name === '.git' && n.isDirectory)` before rendering |
| `src/renderer/components/GitPanel.tsx` | Removed auto-staging useEffect (was lines 114-152); removed `explicitlyUnstagedFiles` state and its usage in `handleStageFile`/`handleUnstageFile` since it only existed to track auto-staging exceptions |

### Rationale
- **Git button**: Showing the Git button on non-repository directories is misleading and causes errors when clicked.
- **Auto-staging**: Automatically staging files is unexpected behavior. Users should explicitly control what gets staged via the + button in the Git panel.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
