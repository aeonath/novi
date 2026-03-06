# Isomorphic-Git Refactor Plan

**Date:** 2026-03-05
**Status:** Planning
**Goal:** Replace all `child_process` git CLI calls with [isomorphic-git](https://github.com/isomorphic-git/isomorphic-git) so Novi works without git installed on the system.

---

## Motivation

The current git integration shells out to `git` via `child_process.exec()` for every operation (status, stage, unstage, commit, push, pull, diff). This creates several problems:

1. **Hard dependency on git CLI** — Novi fails silently if git isn't installed or isn't on PATH
2. **Process spawning overhead** — Every `getStatus()` call spawns 3-4 child processes (`rev-parse`, `branch`, `rev-list`, `status --porcelain`)
3. **Windows-specific pain** — Credential management, SSH askpass, path escaping, and environment variable juggling are fragile
4. **No cross-platform consistency** — Behavior varies depending on the user's git version and config

Isomorphic-git is a pure JavaScript git implementation that uses Node's `fs` module directly. No child processes, no PATH dependency, no shell escaping.

---

## Current Architecture (What We're Replacing)

### Files

| File | Lines | Role |
|------|-------|------|
| `src/main/services/git-service.ts` | 713 | All git operations via `execAsync('git ...')` |
| `src/main/services/git-watcher.ts` | 260 | Chokidar watcher for file change detection |
| `src/main/services/git-credential-helper.ts` | 112 | IPC bridge for credential prompts |
| `src/main/services/ssh-askpass-helper.ts` | 109 | Temp script + polling hack for SSH passphrases |
| `src/renderer/components/GitPanel.ts` | ~400 | Renderer UI (stays mostly unchanged) |
| `src/main/main.ts` (git IPC section) | ~80 | IPC handlers for git operations |

### Current Operations

| Operation | CLI Commands | Notes |
|-----------|-------------|-------|
| `getStatus` | `rev-parse`, `branch --show-current`, `rev-list --left-right`, `status --porcelain` | 4 process spawns per call |
| `stageFile` | `git add -- "file"`, `git status --porcelain -- "file"` | 2 spawns + verification |
| `unstageFile` | `git reset HEAD -- "file"` | 1 spawn |
| `preCommitCheck` | `git diff --cached --name-only`, `git diff --name-only` | 2 spawns |
| `commit` | `git commit -m "msg"` | 1 spawn |
| `push` | `git push` (+ credential retry) | 1-2 spawns |
| `pull` | `git pull` (+ credential retry) | 1-2 spawns |
| `getDiff` | `git diff` or `git diff "file"` | 1 spawn |
| `getRemoteUrl` | `git remote get-url origin` | 1 spawn |
| `getGitUsername` | `git config user.name` | 1 spawn |

---

## Target Architecture

### New Dependencies

```bash
npm install isomorphic-git
# isomorphic-git/http/node is included (for push/pull over HTTPS)
```

No additional dependencies needed. Isomorphic-git uses Node's native `fs` module.

### File Changes

| File | Action | Notes |
|------|--------|-------|
| `src/main/services/git-service.ts` | **Rewrite** | Replace all `execAsync()` with isomorphic-git API calls |
| `src/main/services/git-watcher.ts` | **Keep as-is** | Chokidar still needed for real-time file change detection; isomorphic-git has no watcher |
| `src/main/services/git-credential-helper.ts` | **Simplify** | Replace IPC+env-var credential flow with isomorphic-git's `onAuth` / `onAuthFailure` callbacks |
| `src/main/services/ssh-askpass-helper.ts` | **Delete** | Isomorphic-git handles SSH auth via `onAuth` callback — no temp scripts or polling needed |
| `src/main/main.ts` | **Update IPC section** | Simplify git IPC handlers (remove `.git` existence checks we just added — isomorphic-git handles this internally) |
| `src/renderer/components/GitPanel.ts` | **No changes** | Same IPC contract, same data shapes |
| `src/types/global.d.ts` | **No changes** | IPC API surface stays the same |

### API Mapping

| Current (CLI) | Isomorphic-git equivalent |
|---------------|--------------------------|
| `git rev-parse --is-inside-work-tree` | Check for `.git` dir with `fs.existsSync(join(dir, '.git'))` |
| `git branch --show-current` | `git.currentBranch({ fs, dir })` |
| `git rev-list --left-right --count @{u}...HEAD` | `git.log()` comparison between local and remote tracking ref |
| `git status --porcelain` | `git.statusMatrix({ fs, dir })` |
| `git add -- "file"` | `git.add({ fs, dir, filepath })` |
| `git reset HEAD -- "file"` | `git.resetIndex({ fs, dir, filepath })` |
| `git diff --cached --name-only` | Derive from `statusMatrix` (compare HEAD vs STAGE) |
| `git diff --name-only` | Derive from `statusMatrix` (compare STAGE vs WORKDIR) |
| `git commit -m "msg"` | `git.commit({ fs, dir, message, author })` |
| `git push` | `git.push({ fs, http, dir, onAuth })` |
| `git pull` | `git.pull({ fs, http, dir, onAuth, author })` |
| `git diff "file"` | Read file + `git.readBlob()` + text diff |
| `git remote get-url origin` | `git.getConfig({ fs, dir, path: 'remote.origin.url' })` |
| `git config user.name` | `git.getConfig({ fs, dir, path: 'user.name' })` |

---

## Implementation Plan

### Phase 1: Install + Core Service Rewrite

**Goal:** Replace `git-service.ts` internals while keeping the same public API.

1. `npm install isomorphic-git`
2. Rewrite `GitService` class:
   - Import `import git from 'isomorphic-git'` and `import http from 'isomorphic-git/http/node'`
   - Import Node `fs` as the filesystem backend
   - Replace each method body with isomorphic-git equivalents
   - Keep the same `GitStatus`, `GitFileStatus` interfaces — no renderer changes needed
3. Key implementation details:

#### `getStatus(cwd)`
```typescript
import git from 'isomorphic-git';
import * as fs from 'fs';

async getStatus(cwd: string): Promise<GitStatus> {
  // Check if repo
  const gitDir = join(cwd, '.git');
  if (!fs.existsSync(gitDir)) {
    return { isRepo: false, branch: null, files: [], ahead: 0, behind: 0 };
  }

  const branch = await git.currentBranch({ fs, dir: cwd }) || null;

  // statusMatrix returns [filepath, HEAD, WORKDIR, STAGE] tuples
  const matrix = await git.statusMatrix({ fs, dir: cwd });
  const files = this.parseStatusMatrix(matrix);

  // Ahead/behind from log comparison
  const { ahead, behind } = await this.getAheadBehind(cwd, branch);

  return { isRepo: true, branch, files, ahead, behind };
}
```

#### `statusMatrix` parsing
The matrix returns rows of `[filepath, headStatus, workdirStatus, stageStatus]` where each status is 0 (absent) or 1 (present/match). The combinations map to git status codes:

| HEAD | WORKDIR | STAGE | Meaning |
|------|---------|-------|---------|
| 0 | 2 | 0 | New, untracked |
| 0 | 2 | 2 | New, staged |
| 1 | 1 | 1 | Unmodified (skip) |
| 1 | 2 | 1 | Modified, unstaged |
| 1 | 2 | 2 | Modified, staged |
| 1 | 0 | 0 | Deleted, unstaged |
| 1 | 0 | 1 | Deleted, staged (wait — this is *unstaged* delete) |
| 1 | 1 | 0 | Deleted from stage only |

#### `commit(cwd, message)`
```typescript
async commit(cwd: string, message: string): Promise<{ success: boolean; error?: string }> {
  const name = await git.getConfig({ fs, dir: cwd, path: 'user.name' }) || 'Unknown';
  const email = await git.getConfig({ fs, dir: cwd, path: 'user.email' }) || 'unknown@unknown';

  await git.commit({
    fs, dir: cwd,
    message: message || '',
    author: { name, email },
  });
  return { success: true };
}
```

#### `push(cwd)` and `pull(cwd)`
```typescript
async push(cwd: string): Promise<{ success: boolean; error?: string }> {
  await git.push({
    fs, http, dir: cwd,
    onAuth: () => this.handleAuth(cwd),
    onAuthFailure: () => this.handleAuthFailure(cwd),
  });
  return { success: true };
}
```

The `onAuth` callback replaces the entire credential helper + SSH askpass infrastructure. Isomorphic-git calls it when authentication is needed and accepts `{ username, password }` or `{ username, token }`.

### Phase 2: Authentication Simplification

**Goal:** Replace the credential helper + SSH askpass with isomorphic-git's `onAuth` callbacks.

1. Rewrite `git-credential-helper.ts`:
   - Keep the IPC bridge to renderer (credential prompt UI stays the same)
   - Remove `getCredentialEnvironment()` (no more env vars)
   - The `requestCredentials()` method now returns data for isomorphic-git's `onAuth` callback
2. Delete `ssh-askpass-helper.ts` entirely:
   - Isomorphic-git handles SSH via `onAuth` — no temp scripts, no polling, no batch files
3. Update `main.ts`:
   - Remove SSH askpass environment setup
   - Simplify git IPC handlers

#### SSH Authentication

Isomorphic-git supports SSH via the `onAuth` callback. For SSH keys with passphrases, the flow is:

```typescript
onAuth: async (url) => {
  // First try without passphrase (ssh-agent or unencrypted key)
  return { username: 'git' };
},
onAuthFailure: async (url) => {
  // If that fails, prompt user for passphrase via Novi UI
  const creds = await gitCredentialHelper.requestCredentials({
    type: 'passphrase',
    prompt: `SSH key passphrase for ${url}`,
    host: url,
  });
  return creds.cancelled ? { cancel: true } : { username: 'git', password: creds.password };
}
```

**Important caveat:** Isomorphic-git's SSH support is more limited than native git. It supports HTTPS remotes natively and SSH via `onAuth`, but doesn't support all SSH key types. For SSH repos, we may need to keep a fallback to CLI git or recommend HTTPS.

### Phase 3: Diff Implementation

**Goal:** Implement file diff without shelling out to `git diff`.

Isomorphic-git doesn't have a built-in `diff` command. We need to:

1. Read the staged/HEAD version: `git.readBlob({ fs, dir, oid, filepath })`
2. Read the working directory version: `fs.readFile(filepath)`
3. Compute the diff in JS using a lightweight diff library

Options:
- **`diff` npm package** (~20KB) — produces unified diffs, widely used
- **Manual line-by-line comparison** — sufficient for our GitPanel which just shows changed file names, not inline diffs

Since the current GitPanel only shows file names (not inline diffs), Phase 3 can be deferred. The `getDiff()` method can return an empty string initially and be implemented when inline diff viewing is added.

### Phase 4: Remove CLI Dependency + Cleanup

1. Remove `child_process` import from git-service.ts
2. Remove `promisify(exec)` and `execAsync`
3. Delete `ssh-askpass-helper.ts`
4. Remove the `gitWatcher.queueGitOperation()` serialization for read-only operations (isomorphic-git is thread-safe for reads)
5. Keep the queue for write operations (stage, commit, push, pull) to prevent concurrent writes
6. Update CLAUDE.md architecture docs

### Phase 5: Testing

1. Update existing git-related tests to mock isomorphic-git instead of `child_process`
2. Add new tests for `statusMatrix` parsing (the mapping is non-trivial)
3. Test credential flow with mock `onAuth` callbacks
4. Integration test: init repo, add file, commit, check status
5. Run full test suite: `npm test`

---

## Risks and Mitigations

### 1. SSH Key Support
**Risk:** Isomorphic-git's SSH support is limited compared to native git. Some key types or agent configurations may not work.
**Mitigation:** For Phase 1, focus on HTTPS remotes. SSH support can be a fast-follow. Users with SSH can still use git from the terminal.

### 2. Large Repository Performance
**Risk:** `statusMatrix` scans the entire working tree. For very large repos (10K+ files), this could be slow.
**Mitigation:** Isomorphic-git supports a `filepaths` filter on `statusMatrix` to limit scanning. We can also cache results and only rescan changed paths (the chokidar watcher tells us what changed).

### 3. Git Features Not in Isomorphic-git
**Risk:** Some git features we might want later (rebase, stash, cherry-pick, submodules) have limited or no support.
**Mitigation:** These features aren't in our current implementation either. If needed later, they can be added via the terminal (users can run git commands directly).

### 4. `.gitignore` Handling
**Risk:** Isomorphic-git respects `.gitignore` but the implementation may differ from native git in edge cases.
**Mitigation:** Our current usage is straightforward (status, add, commit). Edge cases are unlikely.

### 5. Bundle Size
**Risk:** Isomorphic-git adds ~350KB (minified) to the bundle.
**Mitigation:** This is far less than the 1.3MB we saved by removing React. And it removes the runtime dependency on git CLI being installed, which is a much bigger win.

---

## Estimated Scope

| Phase | Files Changed | Estimated Effort | Risk |
|-------|--------------|-----------------|------|
| Phase 1: Core rewrite | 1 file (git-service.ts) | Medium | Low |
| Phase 2: Auth simplification | 3 files (credential helper, main.ts, delete askpass) | Small | Medium (SSH) |
| Phase 3: Diff | 1 file (git-service.ts) | Small (defer) | Low |
| Phase 4: Cleanup | 3 files | Small | Low |
| Phase 5: Testing | 2-3 test files | Medium | Low |

**Total: ~5 files changed, 1 file deleted, 2-3 test files added/updated**

The renderer (GitPanel.ts) requires **zero changes** — the IPC contract and data shapes stay identical.

---

## Decision Points for User

1. **SSH support priority** — Should we support SSH remotes in Phase 1, or defer to a later sprint? HTTPS covers GitHub, GitLab, and Bitbucket with PAT/token auth.
2. **Diff implementation** — Do we need inline diffs in the git panel soon, or is file-name-only status sufficient?
3. **Fallback strategy** — Should we keep a CLI fallback for operations isomorphic-git can't handle, or go all-in on the JS implementation?
