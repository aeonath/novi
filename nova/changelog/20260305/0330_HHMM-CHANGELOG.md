# Changelog — 2026-03-05 03:30

## Ad hoc: Fix file tree, git panel, and new terminal CWD when keeptabs is off

### Summary
Multiple components relied on `workspaceRoot` for their directory context, which is `null` when `keeptabs` is off (no workspace restore). Fixed file tree display, git panel, and new terminal creation to use the active terminal's CWD instead.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | `currentFileTreeDisplayRoot`: removed early return when `workspaceRoot` is null so terminal CWD is still used. Added `lastFileTreeRootRef` so novi-prompt tabs show the most recent tab's file tree. New terminal creation now reads the active terminal's CWD from `terminalFileTreeRootsRef` at call time. `GitPanel` now receives `currentFileTreeDisplayRoot || workspaceRoot` instead of just `workspaceRoot`. |
| `src/renderer/components/NoviShell.tsx` | Renamed `savestate` → `keeptabs` (all occurrences). |
| `src/main/services/workspace-service.ts` | Added `homeTerminalCwd` to `WorkspaceState` interface, save serialization, and load deserialization. |
| `src/main/main.ts` | Replaced timeout-based cd injection with OSC 7-driven approach: waits for first PROMPT_COMMAND to prove bash is ready, then injects `cd` only if the current directory differs from the saved one. |

### Rationale
With `keeptabs off`, the app starts with no saved workspace, making `workspaceRoot` null. Components that assumed `workspaceRoot` was always set broke: file tree showed "No folder open", git panel showed "No workspace open", and new terminals started in the wrong directory.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
