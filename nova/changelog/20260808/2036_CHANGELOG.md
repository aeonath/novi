# Changelog — 2026-08-08 20:36

## Ad hoc: Clear stale git-status coloring on repo-root change

### Summary
Third fix in today's git-status-coloring line. User reported that in a
freshly launched window, after `cd`-ing into a clean repo (`git status`
reporting "nothing to commit, working tree clean"), the file tree still
showed 2 files tinted orange — files that, per the user, had never actually
been modified in this session at all.

Traced the gap to `App.updateFileTreeDisplayRoot()`
(`src/renderer/components/App.ts`), which runs on every tab switch, `cd`,
and workspace load, and assigns the new root to `GitPanel.workspaceRoot`.
`GitPanel`'s own setter already clears *its own* internal `gitStatus` field
on a root change (`GitPanel.ts:56-63`) — but that field only drives
GitPanel's own file list UI. `appState.gitStatus` — the shared, global state
`FileTree` actually reads for coloring — was never cleared on that same
transition. So whatever root's status happened to be fetched most recently
(a previous tab, a previous repo, a restored session's terminal reporting
its cwd before the live shell did) stayed plastered on the currently
displayed tree until some unrelated fetch happened to land and overwrite it
— which, for a tab where nothing ever triggers a `.git`-internal change
(plain `cd`/`ls`/`git status`, all read-only), might never happen at all.

Rather than continue chasing the exact async race that produced this
particular instance (workspace-restore ordering, multiple terminal tabs'
concurrent fetches racing `gitService`'s single-slot `cancelActiveStatus()`
— all real but secondary), fixed the actual structural gap directly, per
explicit user direction: colors must never persist across a root change,
full stop. `appState.gitStatus` is now cleared the moment the effective git
root changes, before the fresh fetch for the new root is even kicked off.
Worst case is now "briefly uncolored while the fetch is in flight," never
"colored with another root's data."

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | Added `lastGitRoot` field; `updateFileTreeDisplayRoot()` now clears `appState.gitStatus = null` whenever the effective git root differs from the last one seen, before assigning the new root to `GitPanel.workspaceRoot` |

### Test Results
- 44 suites passed, 0 failed (703 tests — no new tests this round; `App.ts`
  is a large, deeply-coupled component with no existing direct test coverage
  in this codebase — constructing one would need extensive `window.api`
  mocking disproportionate to this one-line guard, so this relies on the
  full suite as a regression net plus the user's live verification)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
