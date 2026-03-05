# Changelog — 2026-03-05 02:03

## Ad hoc: Fix singlefiletree not showing constant directory for terminal tabs

### Summary
When `singlefiletree` was ON, switching to a non-home terminal tab showed the terminal's CWD instead of the constant workspace root. Fixed by reordering the `currentFileTreeDisplayRoot` memo to check `singleFileTree` before the terminal type check.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | Moved `singleFileTree` check before `activeTab?.type === 'terminal'` check in `currentFileTreeDisplayRoot` useMemo |

### Rationale
The `singleFileTree` setting means one constant file tree for all tabs. The terminal CWD branch was evaluated first, bypassing the singleFileTree logic entirely for terminal tabs.

### Test Results
- **605 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
