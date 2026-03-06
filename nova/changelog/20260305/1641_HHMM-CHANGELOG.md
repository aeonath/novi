# Changelog — 2026-03-05 16:41

## Ad hoc: Terminal performance optimizations and #novi command removal

### Summary
Three performance improvements and dead code removal:
1. **IPC data batching**: PTY output is now buffered and flushed every ~16ms (one frame) instead of sending a separate IPC message for every PTY data event. Reduces IPC overhead by 10–100x during burst output.
2. **WebGL renderer**: Enabled `@xterm/addon-webgl` for GPU-accelerated terminal text rendering. Falls back to canvas renderer if WebGL is unavailable.
3. **Removed #novi command interception**: All in-terminal `#novi` command parsing code has been removed (was already disabled via `NOVI_COMMAND_FROM_TERMINAL_ENABLED = false`). This eliminates per-chunk line scanning on the terminal data hot path. A separate filesystem-based `novi` command will replace this functionality.

### Files Changed
- `src/main/main.ts` — Added 16ms IPC data batching buffer for terminal output; removed `ensureNoviStubDir` import and call
- `src/renderer/components/Terminal.tsx` — Added `@xterm/addon-webgl` import and WebGL addon loading with context-loss fallback
- `src/renderer/components/App.tsx` — Removed `parseNoviCommand` import, `toWindowsPathIfNeeded` helper, novi-related refs (`commandLineBufferRef`, `noviPromptTabsRef`, `onNoviPromptRef`), and entire #novi command interception block; simplified terminal data listener to direct passthrough
- `src/main/novi-stub.ts` — **Deleted** (no longer needed)
- `src/renderer/utils/novi-command.ts` — **Deleted** (no longer needed)
- `src/tests/core-0.6.0/novi-command.test.ts` — **Deleted** (tested removed code)
- `package.json` / `package-lock.json` — Added `@xterm/addon-webgl` dependency

### Test Results
- **32 suites, 613 tests — 100% pass**
- Build compiles successfully

### Commit Hash
TBD
