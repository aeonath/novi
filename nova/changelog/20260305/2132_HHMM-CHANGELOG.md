# Changelog — 2026-03-05 21:32

## Replace git CLI with isomorphic-git + add gitenabled setting

### Summary
Replaced all `child_process.exec('git ...')` calls with isomorphic-git, a pure JavaScript git implementation. Novi no longer requires git to be installed for its built-in git UI. Also added a `gitenabled` on/off setting to the Novi Shell to toggle git panel functionality.

### What Changed

#### isomorphic-git Migration
- **`git-service.ts`**: Complete rewrite. All operations (status, stage, unstage, commit, push, pull) now use isomorphic-git's JavaScript API instead of spawning git CLI processes.
  - `getStatus()`: Uses `git.statusMatrix()` + `git.currentBranch()` instead of 4 separate `execAsync()` calls
  - `stageFile()`: Uses `git.add()` / `git.remove()` instead of `execAsync('git add')`
  - `unstageFile()`: Uses `git.resetIndex()` instead of `execAsync('git reset HEAD')`
  - `commit()`: Uses `git.commit()` with author from git config instead of `execAsync('git commit')`
  - `push()`/`pull()`: Uses `git.push()`/`git.pull()` with `onAuth`/`onAuthFailure` callbacks
  - `getDiff()`: Returns empty string (deferred — not needed for current UI)
- **`git-credential-helper.ts`**: Simplified — removed `getCredentialEnvironment()` method (env vars no longer needed). Kept IPC bridge for credential prompts.
- **`ssh-askpass-helper.ts`**: **Deleted entirely**. Isomorphic-git handles auth via callbacks — no temp scripts, no file polling, no batch wrappers.
- **`main.ts`**: Simplified `git-manual-refresh` handler (isomorphic-git checks for `.git` internally).

#### Authentication
- HTTPS: `onAuth` callback prompts user via Novi UI when credentials are needed
- SSH: `onAuth` provides `{ username: 'git' }`, `onAuthFailure` prompts for passphrase via Novi UI

#### gitenabled Setting
- Added `gitenabled` option to Novi Shell (`set gitenabled on|off`)
- Default: on (git panel works as before)
- When off: git toggle button hidden from file tree header, git panel cannot be opened, no git status/watcher activity
- Setting persists across sessions like other Novi Shell settings
- Event-driven: `novi-gitenabled-changed` fires to update UI immediately

### Files Changed
- **`src/main/services/git-service.ts`** — Complete rewrite with isomorphic-git
- **`src/main/services/git-credential-helper.ts`** — Simplified (removed env var methods)
- **`src/main/services/ssh-askpass-helper.ts`** — **Deleted**
- **`src/main/main.ts`** — Simplified git IPC handlers
- **`src/renderer/components/NoviShell.ts`** — Added `gitenabled` to settings
- **`src/renderer/components/App.ts`** — Added `gitEnabled` property, load/event handling, guard git panel
- **`src/renderer/components/FileTree.ts`** — Added `setShowGitToggle()` method
- **`package.json`** — Added `isomorphic-git` dependency

### Dependencies
- Added: `isomorphic-git` (~350KB minified)
- Removed runtime dependency: git CLI (no longer required to be on PATH)

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
