# Ad hoc — File tree always sync to terminal when terminal tab active — 20260213.1548

## Summary
When a terminal tab is active, the file tree now always shows that terminal’s current working directory. Previously, with “single file tree” on we always used the workspace root and never showed the terminal’s CWD; the terminal branch was checked after the singleFileTree check, so it was never used in that mode.

## Files Changed

### Modified
- **src/renderer/components/App.tsx** — In `currentFileTreeDisplayRoot` useMemo: evaluate the **terminal tab first**. If `activeTab?.type === 'terminal'`, use that terminal’s `overriddenRoot ?? cwd ?? workspaceRoot` (with fallback to `workspaceRoot` if still empty). Only then apply the `singleFileTree` / workspace root logic for other tab types. So the file tree stays in sync with the terminal whenever a terminal tab is active, regardless of the singlefiletree setting.

## Reason
User reported the file tree was not synced with the terminal (e.g. tree showed miranova.studio while terminal was in Work/). Ensuring the terminal-tab case is checked first makes the file tree always reflect the active terminal’s CWD.

## Git Commit Hash
`TBD` — Ad hoc: file tree always sync to terminal when terminal tab active

## Status
✅ Completed
