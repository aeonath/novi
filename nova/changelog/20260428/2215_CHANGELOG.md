# Changelog — 2026-04-28 22:15

## Sprint 8 — Novi Command Step 6: CLI Mode Gate in main.ts

### Summary
Wired `cli-mode.ts` into `main.ts`. Added the `--novi-cli` gate so the Electron process enters headless CLI client mode (connects to the socket and exits) instead of launching the GUI when the flag is present. All GUI startup code (`app.whenReady`, `window-all-closed`, SIGINT/SIGTERM handlers) is now gated behind the `else` branch; crash handlers remain unconditional.

### Files Changed

| File | Change |
|------|--------|
| `src/main/main.ts` | Added `import { runCliMode } from './cli-mode'`; added `if (process.argv.includes('--novi-cli'))` gate wrapping all GUI startup code |

### Implementation Details
- `app.setName` and `app.setAppUserModelId` run unconditionally (before the gate) so Electron metadata is set in both modes
- CLI branch: `void runCliMode(process.argv, process.cwd())` — connects to socket or spawns NoviEditor, then calls `app.exit(0)`
- GUI branch: unchanged `app.whenReady`, `window-all-closed`, SIGINT, SIGTERM handlers
- `uncaughtException` and `unhandledRejection` remain outside the gate so crashes in CLI mode are still reported

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
