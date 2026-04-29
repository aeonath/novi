# Changelog — 2026-04-28 22:01

## Sprint 8 — Novi Command Step 2: CliService (Named Pipe Server)

### Summary
Added `CliService` — a Unix domain socket server that runs inside `NoviEditor` and accepts JSON commands from the `novi` CLI tool. The service is started after `createWindow()` and stopped when all windows close.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/cli-service.ts` | New — named pipe server, command handler, `getPipePath()` export |
| `src/main/main.ts` | Import `cliService`; `cliService.start()` after `createWindow()`; `cliService.stop()` in `window-all-closed` |

### Implementation Details
- Socket path: `~/.novi/novi-editor.sock` (Linux) / `%USERPROFILE%\.novi\novi-editor.sock` (Windows via AF_UNIX)
- `~/.novi/` directory created with `{ recursive: true }` — safe on first run or if directory is missing
- Stale socket file from a previous crash is removed at startup
- Per-connection 5-second timeout guards against hung clients
- Commands handled: `ping`, `new-file`, `open-file`, `open-terminal`
- All commands forward to renderer via `webContents.send('open-from-cli', payload)` and focus the window
- Server closed and socket file deleted on `window-all-closed`

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
