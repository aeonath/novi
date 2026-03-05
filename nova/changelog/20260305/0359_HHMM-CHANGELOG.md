# Changelog — 2026-03-05 03:59

## Ad hoc: Various UI fixes (version bump, icon, Clear Workspace, new terminal CWD, git panel)

### Summary
Batch of ad hoc fixes from interactive testing session.

### Changes

| File | Change |
|------|--------|
| `package.json`, `package-lock.json` | Version bumped to 0.7.8 |
| `src/renderer/index.tsx` | Version string updated to 0.7.8 |
| `src/main/main.ts` | Version fallback updated to 0.7.8 |
| `README.md` | Version updated to 0.7.8 |
| `src/renderer/components/App.tsx` | Home terminal icon changed from 🏠 to 🖥️. New terminal starts in active terminal's CWD. GitPanel uses `currentFileTreeDisplayRoot` instead of just `workspaceRoot`. Clear Workspace simplified: kills non-home PTYs, removes non-home tabs, switches to home terminal (preserves home terminal state). Novi-prompt tabs show last active tab's file tree via `lastFileTreeRootRef`. |
| `src/renderer/components/TitleBar.tsx` | "Reset Workspace" renamed to "Clear Workspace" |
| `src/main/menu.ts` | "Reset Workspace" renamed to "Clear Workspace" |

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
