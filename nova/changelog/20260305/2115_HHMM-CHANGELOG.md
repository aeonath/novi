# Changelog — 2026-03-05 21:15

## Performance: Fix UI freeze on large directories + slow loading dots

### Summary
Navigating to large directories (e.g. Windows home directory) made the UI unresponsive due to three compounding issues: unnecessary `stat()` calls on every directory entry, git operations running on non-git directories, and an overly fast loading animation.

### Changes

#### 1. Remove stat() calls from read-directory (biggest perf win)
The `read-directory` IPC handler was calling `stat()` on every file in the directory via `Promise.all`. For a home directory with hundreds of entries (many being Windows AppX symlinks that hang or error), this was extremely slow. The `stat()` was only used to get file size, which the file tree doesn't display. Replaced with a simple synchronous loop using `entry.isDirectory()` from `readdir({ withFileTypes: true })` — no stat calls at all.

#### 2. Skip git operations on non-git directories
- `git-start-watching`: Now checks for `.git` directory existence before starting chokidar. Previously it would recursively watch the entire directory tree even for non-repos, which was devastating for large directories like home.
- `git-manual-refresh`: Now checks for `.git` existence before spawning `git rev-parse` process. Returns `{ isRepo: false }` immediately for non-git dirs.

#### 3. Slow down loading dots animation
Changed dot pulse from 1.2s/0.2s stagger to 2.5s/0.4s stagger for a calmer, more readable animation.

### Files Changed
- **`src/main/main.ts`** — Removed `stat()` from `read-directory` handler; added `.git` existence checks in `git-start-watching` and `git-manual-refresh`
- **`src/renderer/components/FileTree.ts`** — Slowed loading dots animation timing

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
