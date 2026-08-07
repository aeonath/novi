# Changelog — 2026-08-06 20:33

## Ad Hoc — Fix app freeze on large repos + gitenabled not fully disabling git

### Summary
Opening a large repository (e.g. a multi-gigabyte site checkout) in the Novi shell froze
the entire app — terminal input, File/Options menus, everything — with no way to recover
short of killing the process. Root cause: `GitService.getStatus()` ran isomorphic-git's
`statusMatrix()` (a full working-tree walk) directly on the **Electron main process**,
and it was triggered automatically and unconditionally on every terminal `cd` (OSC 7 pwd
report) and every file-tree directory open. `statusMatrix()` does CPU-bound JS work
(ignore-pattern matching, hashing) with no yield points, so on a big repo it monopolized
the single-threaded main process for as long as the scan took — and since all menu clicks
and terminal I/O are routed through that same process via IPC, the whole app appeared
locked up. Verified against the actual large repo the user hit this with: the scan took
~1.7s and, on the old code, would have frozen the app for that entire duration on every
single `cd`.

Separately, the `gitenabled` Settings toggle only ever gated the Git Panel's visibility —
it never gated the automatic status-scan call sites above, so turning git off did nothing
to stop (or cancel) an in-progress freeze, matching the report that disabling git in
Options didn't unlock the frozen app.

### Fix
1. **`GitService.getStatus()` now runs `statusMatrix()` in a `worker_thread`** instead of
   inline on the main process. The main process (and therefore all menus/IPC/terminal
   input) stays fully responsive regardless of repo size. Only one scan runs at a time —
   a new request (e.g. rapid `cd`) terminates the previous worker outright (true
   preemption, not just promise cancellation) rather than letting a stale scan keep
   burning CPU for a directory nobody cares about anymore.
2. **`gitenabled` now takes effect immediately, everywhere, without a restart**:
   - Renderer: the two automatic `gitGetStatus` call sites (terminal pwd-change handler,
     file-tree directory-open handler) and the Git Panel's manual-refresh callback now all
     check `gitEnabled` before calling into the API at all.
   - Turning the setting off immediately calls `gitStopWatching()` and clears the cached
     git status in the renderer.
   - Main process: setting `gitenabled` to `false` now calls `gitWatcher.unwatch()` and
     `gitService.cancelActiveStatus()` synchronously in the `set-setting` handler, so an
     in-flight scan is torn down the instant the toggle flips — not just gated for future
     calls.
   - Defense in depth: `git-get-status`, `git-manual-refresh`, and `git-start-watching` IPC
     handlers now also check the persisted `gitenabled` setting themselves, so no current
     or future renderer call site can trigger git work while it's disabled.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/git-status-worker.ts` | New — runs `git.currentBranch`/`statusMatrix`/ahead-behind in a worker thread, posts `{ ok, status }` or `{ ok: false, error }` back |
| `src/main/services/git-service.ts` | `getStatus()` dispatches to the worker with single-in-flight-scan semantics; new `cancelActiveStatus()`; removed now-dead `parseStatusMatrix`/`getAheadBehind` (logic moved into the worker) |
| `src/main/main.ts` | `set-setting` handler stops the git watcher + cancels any active scan when `gitenabled` is set to `false`; `git-get-status`, `git-manual-refresh`, `git-start-watching` IPC handlers gate on the persisted `gitenabled` setting |
| `src/renderer/components/App.ts` | Terminal pwd-change and file-tree directory-open handlers, plus the Git Panel's refresh callback, now check `this.gitEnabled` before calling `gitGetStatus`; the `gitenabled`-change handler now stops the watcher and clears `appState.gitStatus` immediately when turned off |
| `src/tests/core-0.8.0/git-service.test.ts` | New — covers `getStatus()`'s worker dispatch, error handling, supersession/cancellation, and `cancelActiveStatus()` |

### Verification
- Ran the new worker against the actual large repo (`../aeonath.com`, 2.3GB / 1886 files)
  via a standalone script: scan completed in ~1.7s while a 50ms main-thread heartbeat kept
  ticking on schedule throughout, confirming the main thread is never blocked.
- WSL support (the opt-in "WSL Bash" terminal shell type) is unrelated and untouched.

### Test Results
- 665 tests passed, 0 failed (40 suites) — up from 659/659, 39 suites (new git-service.test.ts)
- `npm run build` completes cleanly

### Commit
TBD
