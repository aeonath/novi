# Changelog — 2026-03-05 21:53

## Revert parent .git detection (fix 5GB memory leak)

### Summary
Reverted the parent `.git` directory detection added in the previous change. The `findRoot()` approach caused `git.statusMatrix()` to scan the entire working tree of large repositories when the user was in a subdirectory, consuming 5+ GB of RAM. Git features now only activate when `.git` is directly in the current directory.

### What Changed

#### `src/main/services/git-service.ts`
- `getStatus()`: Reverted from `findRoot(cwd)` to `fs.existsSync(join(cwd, '.git'))` check
- `statusMatrix` now only runs on the directory that directly contains `.git`, preventing recursive scanning of massive repos
- `findRoot()` method kept for other operations (stage, commit, push, pull) which only run from the git panel when `.git` is already confirmed present

#### `src/main/main.ts`
- `git-start-watching`: Reverted from `gitService.findRoot()` to `existsSync(join(repoPath, '.git'))` check
- Git watcher only starts when `.git` is directly in the watched directory

#### `src/renderer/components/FileTree.ts`
- Removed `_inGitRepo` flag and `checkGitRepo()` method
- Reverted `renderHeader()` git button condition to `this.tree.some(n => n.name === '.git' && n.isDirectory)`
- Git button only shows when `.git` is visible in the file tree (direct child of current directory)

### Root Cause
`git.statusMatrix({ fs, dir: root })` recursively scans every file in the working tree. When `findRoot()` resolved a parent directory as the repo root, this meant scanning thousands of files across the entire repo, causing Node.js to consume 5+ GB of RAM.

### Files Changed
- **`src/main/services/git-service.ts`** — Reverted `getStatus()` to direct `.git` check
- **`src/main/main.ts`** — Reverted `git-start-watching` to direct `.git` check
- **`src/renderer/components/FileTree.ts`** — Removed `checkGitRepo()`, `_inGitRepo`; reverted to tree content check

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
