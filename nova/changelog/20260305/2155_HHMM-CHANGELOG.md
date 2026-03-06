# Changelog — 2026-03-05 21:55

## Fix stale ahead/behind counts after push

### Summary
After pushing via the git panel, the ahead/behind commit counts stayed stale (e.g. showing "11 ahead" after a successful push). This happened because isomorphic-git's `push()` doesn't update the local remote tracking ref (`refs/remotes/origin/<branch>`). Added a lightweight single-branch `fetch()` after push to update the ref so `getAheadBehind()` returns accurate counts.

### Implementation
- Added `fetchRemoteRef(dir)` private method to `GitService`
- Uses `git.fetch({ singleBranch: true, ref: currentBranch })` — only fetches the single ref needed, not the entire remote
- Called after successful `push()` to update the remote tracking ref
- Failure is non-critical (silently caught) — worst case is stale counts until next manual refresh

### Files Changed
- **`src/main/services/git-service.ts`** — Added `fetchRemoteRef()`, called after `push()`

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
