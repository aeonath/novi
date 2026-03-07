# Changelog — 2026-03-07 10:07

## Ad hoc: Fix critical memory leak — debounce git statusMatrix calls

### Problem
Running shell scripts (e.g., deploy.sh calling build tools or AWS CLI) caused memory
to explode from ~200MB to 3+ GB. The root cause: the git file watcher detected N file
changes and fired N individual `git-change` IPC events. Each event triggered an
unthrottled `gitManualRefresh()` → `statusMatrix()` call that reads every file in the
repo via native fs buffers. With 55 concurrent statusMatrix calls, native (`external`)
memory ballooned to 2.7 GB.

### Root Cause
- `GitPanel.gitOnChange` called `gitManualRefresh` on every single `git-change` event
  with no debounce — N file changes = N concurrent full-tree scans
- `statusMatrix()` allocates native fs Buffers (visible in `process.memoryUsage().external`)
- Multiple concurrent calls multiplied memory usage multiplicatively

### Fix
1. **Debounced git-change handler** (`GitPanel.ts`): 1-second debounce so rapid file
   changes trigger only ONE statusMatrix refresh instead of N.
2. **Capped PTY data buffer** (`main.ts`): Added 128KB max buffer with immediate flush
   to prevent unbounded string growth during high-throughput terminal output.
3. **Reduced xterm scrollback** (`Terminal.ts`): 50,000 → 10,000 lines. Lowers per-terminal
   memory ceiling from ~160MB to ~32MB while still providing ample scroll history.

### Results
| Metric | Before | After |
|--------|--------|-------|
| Peak RSS | 3,046 MB | 254 MB |
| Peak external | 2,749 MB | 51 MB |
| Settled RSS | 1,691 MB | 161 MB |

### Files Changed
- `src/renderer/components/GitPanel.ts` — debounce onChange handler (1s), cleanup timer
- `src/main/main.ts` — 128KB buffer cap with immediate flush on PTY data handler
- `src/renderer/components/Terminal.ts` — scrollback 50000 → 10000

### Tests
- 654 passed, 0 failed

### Commit
`TBD`
