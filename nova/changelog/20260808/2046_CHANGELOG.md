# Changelog — 2026-08-08 20:46

## Ad hoc: Remove duplicate gitGetStatus call racing the one from the previous fix

### Summary
User reported a staged-modified file (`buildit.sh`, staged via `git add`)
not getting colored after `cd`-ing into a repo, despite `git status`
correctly showing it under "Changes to be committed."

Root cause: the previous fix (dbf68b6) made `updateFileTreeDisplayRoot()`
fetch `appState.gitStatus` directly whenever the effective git root
changes. `App`'s `terminalOnPwd` handler calls `updateFileTreeDisplayRoot()`
on every `cd` — but it *also* had its own separate, independent
`window.api.gitGetStatus(pwd)` call a few lines later, for the exact same
`pwd`. Both fire on every single `cd`. `gitService.getStatus()` keeps only
one in-flight request at a time (`cancelActiveStatus()` cancels whatever's
still running the instant a new call starts) — so these two calls raced
each other on every `cd`, and whichever one lost got cancelled and resolved
to `EMPTY_STATUS` (`isRepo: false`). Both call sites treated `isRepo: false`
as "not a repo, clear the status" and unconditionally wrote `appState.gitStatus
= null` — so the loser could clobber the winner's correct, real result
depending purely on microtask/worker-thread timing. Two independent fetches
racing for the same data, with the loser having license to overwrite the
winner, is a bug pattern regardless of which specific field happened to be
wrong in this instance.

Fix: removed the redundant direct fetch from `terminalOnPwd` — 
`updateFileTreeDisplayRoot()` (called synchronously a few lines above it in
the same handler) already refreshes `appState.gitStatus` whenever a `cd`
moves the *active* tab's effective root, which is the only case that should
affect the displayed tree's coloring anyway. As a side effect this also
fixes a latent, unrelated correctness gap: the old code refreshed
`appState.gitStatus` for *any* terminal's `cd`, including a background,
non-active tab — which could clobber the currently-displayed tab's colors
with an unrelated directory's status. That can no longer happen, since only
`updateFileTreeDisplayRoot()`'s root-change check (based on the *active*
tab) drives the fetch now.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | Removed the duplicate `window.api.gitGetStatus(pwd)` call from the `terminalOnPwd` handler — `updateFileTreeDisplayRoot()`, already called earlier in the same handler, now owns refreshing `appState.gitStatus` on every root change |

### Test Results
- 44 suites passed, 0 failed (703 tests — no new tests; see prior two entries for why `App.ts` has no direct test harness in this codebase)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
