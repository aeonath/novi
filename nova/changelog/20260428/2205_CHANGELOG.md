# Changelog — 2026-04-28 22:05

## Sprint 8 — Novi Command Step 4: Preload Update (onOpenFromCli)

### Summary
Wired the `open-from-cli` IPC channel through the preload bridge so the renderer can listen for CLI-triggered actions. Added the `OpenFromCliPayload` interface to the shared types file so it is available to both the preload and renderer processes.

### Files Changed

| File | Change |
|------|--------|
| `src/preload/preload.ts` | Added `onOpenFromCli` and `removeOpenFromCliListener` to `window.api` |
| `src/types/global.d.ts` | Added `OpenFromCliPayload` interface; added `onOpenFromCli` and `removeOpenFromCliListener` to `Window.api` type declaration |

### Implementation Details
- `onOpenFromCli` follows the same `ipcRenderer.on` pattern as `onMenuCommand`
- `removeOpenFromCliListener` removes all `open-from-cli` listeners for clean teardown
- `OpenFromCliPayload` is defined in `global.d.ts` (renderer/preload context) and separately in `cli-service.ts` (main process context) — identical shape, separate definitions following the Electron cross-process type convention

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
