# Changelog — 2026-03-05 02:34

## Ad hoc: Fix crash from leftover setExplicitlyUnstagedFiles references

### Summary
The app showed a blank gray screen on startup due to a `ReferenceError: setExplicitlyUnstagedFiles is not defined` in GitPanel.tsx. When removing the auto-staging state in Task 4, two references to `setExplicitlyUnstagedFiles` were missed (workspace change cleanup at line 63 and post-commit cleanup at line 217). Unit tests didn't catch this because React components (.tsx) are not unit tested.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/GitPanel.tsx` | Removed two leftover `setExplicitlyUnstagedFiles(new Set())` calls (workspace change handler and post-commit handler) |

### Rationale
The state variable was removed in Sprint 7 Task 4 but two setter calls survived, causing a fatal runtime error that crashed the entire React tree.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully
- Verified `setExplicitlyUnstagedFiles` no longer appears in the built bundle

### Commit Hash
TBD
