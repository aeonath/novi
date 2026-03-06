# Changelog — 2026-03-05 21:57

## Fix git watcher not detecting CLI git operations

### Summary
The git panel showed stale status after command-line git operations (push, commit, etc.) because the chokidar watcher's ignored patterns were accidentally excluding all `.git/` internals. The first ignore rule `/(^|[\/\\])\../` caught ALL dotfiles including `.git`, so changes to `.git/HEAD`, `.git/refs/`, and `.git/index` were never detected.

### Root Cause
Chokidar's `ignored` array is evaluated as OR — if any pattern matches, the path is skipped. The generic dotfile pattern matched `.git` before the more specific `.git` exception pattern could be evaluated.

### Fix
- Changed dotfile ignore to `/(^|[\/\\])\.(?!git([\/\\]|$))/` — excludes all dotfiles/folders EXCEPT `.git`
- Changed `.git` internal ignore to `/\.git[\/\\](?!HEAD$|index$|refs[\/\\]|FETCH_HEAD$|ORIG_HEAD$)/` — only watches the key files that change on git operations (HEAD, index, refs/, FETCH_HEAD, ORIG_HEAD)
- This means CLI operations like `git commit`, `git push`, `git pull`, `git checkout` will trigger the watcher and auto-refresh the git panel

### Files Changed
- **`src/main/services/git-watcher.ts`** — Fixed ignored patterns to watch `.git/` key files

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
