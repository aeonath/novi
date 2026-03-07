# Changelog — 2026-03-07 10:30

## Ad hoc: Narrow git watcher to .git/ internals only

### Problem
The git watcher (chokidar) was watching the ENTIRE repo directory recursively.
It did not respect .gitignore, so gitignored files like build artifacts in `public/`
triggered change events. On cd'ing into miranova.studio and running a build, 55
gitignored files triggered 55 `git-change` IPC events — even though zero git-tracked
files had changed. This was the root cause of the 3GB memory spike fixed in the
previous commit; the debounce was a band-aid, this is the proper fix.

### What Changed
Rewrote `git-watcher.ts` to ONLY watch `.git/` internals:
- `.git/HEAD` — branch switch, checkout
- `.git/index` — stage, unstage, commit
- `.git/refs/` — commit, push, pull, fetch, merge
- `.git/FETCH_HEAD` — fetch, pull
- `.git/ORIG_HEAD` — merge, rebase

These are the only files that change when git state changes. Working tree files
are not watched — `statusMatrix()` already re-reads the full tree when called.

### Also Cleaned Up
- Removed `awaitWriteFinish` polling (unnecessary for .git files, caused overhead)
- Removed orphaned `batch-change` event and its IPC forwarder in `main.ts`
  (no renderer listener existed for `git-batch-change`)
- Removed per-file tracking (`changedFiles` Set) — no longer needed with .git-only watch
- Single debounced 'change' event (500ms) instead of per-file + batch dual events

### Files Changed
- `src/main/services/git-watcher.ts` — rewritten: watch .git/ internals only
- `src/main/main.ts` — removed orphaned `batch-change` forwarder

### Tests
- 654 passed, 0 failed

### Commit
`TBD`
