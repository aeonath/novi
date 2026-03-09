# Changelog — 20260308.1914

## Ad hoc: Fix tab restoration freeze from stale active tab IDs

### Problem
When restoring workspace tabs on startup, the app would freeze/blank because:
1. Saved `activeTabId` referenced old tab IDs from the previous session
2. Restored terminals and novi prompts receive new generated IDs
3. `setActiveTab()` was called with a non-existent ID, causing all terminals to be hidden (`display: none`) and no PTY initialization

Secondary issue: `syncTerminalInstances()` and `syncNoviShellInstances()` were called inside their restoration loops instead of once after, causing redundant DOM work.

### Changes
- **`src/renderer/components/App.ts`** — `loadWorkspace()`:
  - Build `oldToNewTabId` mapping during terminal and novi prompt restoration
  - Move `syncTerminalInstances()` call outside the terminal loop (once after all terminals added)
  - Move `syncNoviShellInstances()` call outside the novi prompt loop (once after all prompts added)
  - Map saved `activeTabId` to the new ID before calling `setActiveTab()`
  - Also call `tabBarAPI.switchTab(newId)` so the tab bar UI reflects the active tab
  - Use index-based IDs (`restore-0`, `restore-1`) instead of `Math.random()` for deterministic uniqueness

### Files Changed
- `src/renderer/components/App.ts`

### Test Results
- 39 suites, 646 tests — all passing
- Build compiles successfully

### Commit
TBD
