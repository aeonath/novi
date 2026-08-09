# Changelog — 2026-08-08 20:41

## Ad hoc: Fetch fresh git status directly on root change, not just clear it

### Summary
Immediate follow-up to the previous fix (91f49f2). That fix cleared
`appState.gitStatus` whenever `App.updateFileTreeDisplayRoot()` detected the
effective git root had changed, expecting `GitPanel.workspaceRoot`'s own
setter to repopulate it — `GitPanel`'s setter calls `startWatching()`,
which after a 100ms delay does a one-shot `refreshStatus()` that (via the
`onRefreshStatus` callback) eventually writes back to `appState.gitStatus`.
User reported that switching away to the Settings tab and back left the
file tree with no coloring at all — the clear fired, but nothing reliably
repopulated it in this transition.

Rather than depend on that indirect, delayed, multi-hop chain (App → GitPanel
setter → startWatching's 100ms timeout → refreshStatus → onRefreshStatus
callback → back into App), made the fix self-contained: the moment
`updateFileTreeDisplayRoot()` detects a root change, it now clears
`appState.gitStatus` *and* immediately calls `window.api.gitGetStatus()`
directly for the new root, applying the result (or `null` if it's not a
repo) as soon as it resolves — the same direct pattern already used by the
`terminalOnPwd` handler elsewhere in this file. A staleness guard
(`this.lastGitRoot !== effectiveGitRoot` re-checked inside the `.then`)
drops the result if a *newer* root change has already superseded this one
by the time the fetch completes, so an in-flight fetch for an
already-abandoned root can never clobber the current one.

GitPanel's own `startWatching()` cascade still runs afterward for its own
internal `gitStatus` (which drives its own file-list UI) — this is
somewhat redundant now (two status fetches can race, though
`gitService`'s own single-slot cancellation just makes the loser resolve to
empty rather than produce wrong data) but was left as-is to keep this fix
minimal; not a correctness concern.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | `updateFileTreeDisplayRoot()`'s root-change branch now fetches fresh status directly via `window.api.gitGetStatus(effectiveGitRoot)` immediately after clearing, instead of only clearing and waiting on GitPanel's own delayed refresh cascade; guards against a stale response from an already-superseded root |

### Test Results
- 44 suites passed, 0 failed (703 tests — same reasoning as the previous
  entry: `App.ts` has no existing direct test harness in this codebase)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
