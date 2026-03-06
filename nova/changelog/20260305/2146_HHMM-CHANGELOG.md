# Changelog — 2026-03-05 21:46

## Git panel works from subdirectories (parent .git detection)

### Summary
The git panel + icon now shows when the terminal CWD is inside a git repository, even if `.git` is in a parent directory. Previously, the git button only appeared if `.git` was a direct child of the current directory. Now it behaves like the `git` CLI — any subdirectory within a repo has access to git features.

### Implementation

#### isomorphic-git `findRoot()`
- Added `findRoot(cwd)` method to `GitService` using `git.findRoot({ fs, filepath })`, which walks up parent directories to find `.git`
- All git operations (`getStatus`, `stageFile`, `unstageFile`, `commit`, `push`, `pull`) now resolve `cwd` to the repo root before calling isomorphic-git APIs
- `git-start-watching` IPC handler now watches the repo root (found via `findRoot`), not the passed-in subdirectory

#### New IPC: `git-find-root`
- Added `git-find-root` IPC handler that returns the repo root path or null
- Exposed as `window.api.gitFindRoot(cwd)` in preload

#### FileTree git button
- Added `_inGitRepo` flag to FileTree component
- `displayRoot` setter now calls `checkGitRepo(path)` which invokes `gitFindRoot` asynchronously
- `renderHeader()` uses `_inGitRepo` instead of scanning tree contents for `.git` directory
- This means the git button appears when you `cd` into `src/` of a repo, not just when at the repo root

### Files Changed
- **`src/main/services/git-service.ts`** — Added `findRoot()`, all operations resolve to repo root
- **`src/main/main.ts`** — Added `git-find-root` IPC handler, updated `git-start-watching` to use findRoot
- **`src/preload/preload.ts`** — Added `gitFindRoot` API
- **`src/types/global.d.ts`** — Added `gitFindRoot` type declaration
- **`src/renderer/components/FileTree.ts`** — Added `_inGitRepo` flag, `checkGitRepo()` method, updated header rendering

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
