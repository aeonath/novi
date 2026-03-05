# Changelog — 2026-03-05 01:57

## Ad hoc: Persist terminal CWD across restarts

### Summary
Terminal tabs now save their current working directory to the workspace file. On restart, each terminal (including the Home terminal) starts in its last known CWD instead of defaulting to the workspace root or home directory.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | Save CWD for each terminal tab in workspace (from `terminalFileTreeRoots`); save `homeTerminalCwd` separately; restore terminals with saved CWD as `workspaceRoot`; pass saved CWD to `createHomeTerminal` |

### Rationale
Users expect their terminal sessions to resume where they left off. This is the most impactful persistence feature for terminal-first workflow.

### Test Results
- **605 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
