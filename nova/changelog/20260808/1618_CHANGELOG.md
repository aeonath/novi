# Changelog — 2026-08-08 16:18

## Ad hoc: Fix git-status listener leak causing stale file-tree coloring after commit

### Summary
User reported (with a screenshot) that after committing tracked files from
an integrated terminal tab (not the app's own Git panel), the file tree kept
showing those files tinted orange/red — the coloring added in the previous
change never cleared even though `git status` in the same terminal reported
a clean tree.

Root cause: `GitPanel.startWatching()` called `window.api.gitOnChange(...)`
every time `workspaceRoot` changed — which happens on essentially every tab
switch or file-tree navigation, since each terminal tab tracks its own tree
root. `preload.ts`'s `gitOnChange` is a bare `ipcRenderer.on('git-change',
handler)` with no dedup, so listeners piled up for the lifetime of the
panel. All of them shared the single `changeDebounceTimer` instance field,
so when a real `.git`-internal change arrived (from the terminal's `git
commit`), every accumulated listener fired and clobbered the previous one's
pending timeout via `clearTimeout` — only the *last-registered* listener's
callback ever actually ran, using whichever `root` was captured in its
closure *at the moment that particular `startWatching()` call happened*.
In a normal session with several tab switches, that stale closure can
easily point at a directory that no longer matches the currently active
terminal, so the post-commit refresh either queried the wrong repo or
silently no-op'd — leaving `appState.gitStatus` (and therefore FileTree's
coloring) frozen at its last correct value from before the commit.

Fix: the IPC listener is now registered exactly once, in `onMount()`,
via a new `setupChangeListener()` guarded by a `changeListenerRegistered`
flag. Its debounced handler reads `this._workspaceRoot` at fire time
instead of capturing a `root` const, so it always refreshes against
whatever repo is *currently* active, no matter how many times the root has
changed since the listener was set up. `startWatching()` keeps its
per-root responsibilities (telling the main-process watcher which `.git`
to watch, and doing one one-shot status fetch) but no longer touches the
IPC listener at all.

While in this file, removed two pre-existing dead fields
(`DEBUG_GIT_OPERATIONS`, `currentCredentialRequest`) that were write-only/
never referenced — `tsc`'s `noUnusedLocals` rejected the new test file the
moment it imported `GitPanel.ts` directly (nothing had before), so these
had to go to unblock compilation.

Verified the new regression test actually catches the bug: temporarily
reintroduced the old per-call registration (no dedup guard) and confirmed
2 of the 5 new tests failed exactly as expected (5 registrations instead
of 1; double cleanup calls), then restored the fix and reran clean.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/GitPanel.ts` | Moved the `.git`-change IPC listener registration out of `startWatching()` (called per root change) into a new one-time `setupChangeListener()` called from `onMount()`; its handler now reads `this._workspaceRoot` at fire time instead of a captured `root`; removed dead `DEBUG_GIT_OPERATIONS` const and `currentCredentialRequest` field |
| `src/tests/core-0.8.0/git-panel-change-listener.test.ts` | New: verifies `gitOnChange` is registered exactly once across multiple `workspaceRoot` changes, that a `.git`-change event refreshes against the *current* root (not a stale one captured before a root change), that `onRefreshStatus` fires, that rapid successive change events debounce into one refresh, and that the listener is cleaned up exactly once on destroy |

### Test Results
- 43 suites passed, 0 failed (700 tests, 5 new)
- Manually confirmed the new tests fail against the reverted (buggy) per-call registration, then pass again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
