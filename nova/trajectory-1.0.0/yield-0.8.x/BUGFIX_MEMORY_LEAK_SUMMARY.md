# Bugfix Summary: 3GB Memory Leak from Git Watcher

**Date:** 2026-03-07
**Commits:** `55bd431`, `7988ebc`
**Branch:** dev-core

## Problem

Running a simple shell script (deploy.sh calling build tools / AWS CLI) caused Novi's
memory to explode from ~200MB to 3+ GB. The app became unusable.

## Root Cause

The git file watcher (`git-watcher.ts`) used chokidar to watch the **entire repo
directory recursively**. It did not respect `.gitignore`. When the user cd'd into a
project and ran a build script:

1. Build tools generated files in gitignored directories (e.g., `public/`)
2. Chokidar detected 55 file changes — none of which affected git status
3. Each change fired an individual `git-change` IPC event to the renderer
4. `GitPanel.gitOnChange` called `gitManualRefresh()` for every event — **no debounce**
5. Each `gitManualRefresh()` invoked `isomorphic-git.statusMatrix()`, which reads every
   file in the working tree via Node.js `fs` module
6. 55 concurrent `statusMatrix()` calls allocated massive native fs Buffers
7. `process.memoryUsage().external` peaked at **2,749 MB** (2.7 GB)

## Diagnosis

Added `process.memoryUsage()` logging to the main process. The JS heap was only
~143 MB — the `external` (native C++ memory) column revealed the true culprit:
native fs Buffers from concurrent `statusMatrix()` scans.

## Fix (Two Commits)

### Commit 1: Debounce + Buffer Cap (`55bd431`)
- **GitPanel.ts**: Added 1-second debounce on `gitOnChange` — 55 rapid events now
  trigger exactly 1 `statusMatrix()` call instead of 55
- **main.ts**: Capped PTY data buffer at 128KB with immediate flush to prevent
  unbounded string growth during high-throughput terminal output
- **Terminal.ts**: Reduced xterm scrollback from 50,000 to 10,000 lines

### Commit 2: Proper Fix — Narrow Git Watcher (`7988ebc`)
- **git-watcher.ts**: Rewrote to watch ONLY `.git/` internals:
  - `.git/HEAD` — branch switch, checkout
  - `.git/index` — stage, unstage, commit
  - `.git/refs/` — commit, push, pull, fetch, merge
  - `.git/FETCH_HEAD` — fetch, pull
  - `.git/ORIG_HEAD` — merge, rebase
- Removed `awaitWriteFinish` polling (unnecessary for .git files)
- Removed orphaned `batch-change` event (no renderer listener existed)
- **main.ts**: Removed orphaned `git-batch-change` IPC forwarder

## Results

| Metric | Before | After (Commit 1) |
|--------|--------|-------------------|
| Peak RSS | 3,046 MB | 254 MB |
| Peak external | 2,749 MB | 51 MB |
| Settled RSS | 1,691 MB | 161 MB |

After Commit 2, the watcher no longer reacts to working tree files at all, so the
55-file batch change scenario cannot occur regardless of debounce.

## Files Changed
- `src/main/services/git-watcher.ts` — rewritten: .git/ internals only
- `src/renderer/components/GitPanel.ts` — debounce onChange (1s), cleanup timer
- `src/main/main.ts` — PTY buffer cap (128KB), removed orphaned batch-change forwarder
- `src/renderer/components/Terminal.ts` — scrollback 50,000 → 10,000

## Tests
- 654 passed, 0 failed (all runs)

## Key Lesson
Never watch an entire repo directory to detect git status changes. Working tree watches
are noisy (gitignored files, OS phantom events, build artifacts) and the resulting
`statusMatrix()` calls are expensive. Watch `.git/` internals — that's the single
source of truth for git state.
