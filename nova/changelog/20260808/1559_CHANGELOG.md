# Changelog — 2026-08-08 15:59

## Ad hoc: Color-code file tree entries by git status (gated on git support)

### Summary
Added git-status coloring to the file tree, active only when the built-in
Git Support setting (`gitenabled`) is on. New/untracked files render green,
modified files render orange, deleted render red, renamed render blue — the
same palette GitPanel already uses for its status list, reused here for
consistency. A directory whose contents include a changed file is tinted
with that file's color too, even while collapsed, so changes are visible
without expanding every folder.

Gating works "for free": `App.ts` already sets `appState.gitStatus = null`
whenever git support is disabled or the folder isn't a repo, and now sets it
whenever it's re-enabled. `FileTree.buildGitStatusMaps()` treats a null/
non-repo status as "nothing to color," so no new setting plumbing was
needed in `FileTree.ts` — it just reads the existing shared state.

Along the way, fixed a live bug that would have made coloring never update:
`FileTree.ts` was subscribed to the event-bus string `'app:gitStatusChanged'`,
but `appState`'s setter actually emits `AppEvents.GIT_STATUS_CHANGED`
(`'app:git-status-changed'`) — a typo mismatch (camelCase vs. the real
kebab-case event) that meant the footer's git-branch badge only ever updated
because `render()` happened to be called from elsewhere, not from this
listener. The cleanup call also passed a second argument to `bus.off()`,
whose signature only takes the event name and deletes every listener for
it — even if the string had matched, unmounting one FileTree would have
silently killed every other subscriber's listener for that event. Rewired
to use the unsubscribe closure `bus.on()` already returns (same pattern
`MonacoEditor.ts` uses), and pointed the listener at a full `render()` so
tree colors and the footer both refresh when git status changes.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/FileTree.ts` | Added `gitFileStatus`/`gitDirStatus` maps built from `appState.gitStatus` each render; `getGitStatusColor()` looks up a node's (or its collapsed ancestor directory's) status and tints the name span; fixed the git-status-changed event subscription (wrong event string + broken `bus.off` cleanup) to use `bus.on()`'s returned unsubscribe function and trigger a full re-render |
| `src/tests/core-0.8.0/file-tree-git-status.test.ts` | New: verifies no coloring when git support is off (`gitStatus` null) or not a repo, green for untracked, orange for modified, uncolored for clean files, color bubbling to a collapsed ancestor directory, and live re-coloring when `appState.gitStatus` changes after mount |

### Test Results
- 42 suites passed, 0 failed (695 tests, 7 new)
- `npx tsc -p tsconfig.renderer.json --noEmit`: no new errors (all output pre-existing, unrelated to FileTree.ts)
- `npm run build`: main/preload/core `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
