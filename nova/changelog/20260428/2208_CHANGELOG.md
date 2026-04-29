# Changelog — 2026-04-28 22:08

## Sprint 8 — Novi Command Step 5: Renderer Handler

### Summary
Added the renderer-side handling for CLI-triggered actions in `App.ts`. Three new methods (`openFileFromPath`, `createTerminalTab`, `createNewFileTab`) implement the actual tab-opening logic. The `onOpenFromCli` IPC listener dispatches to them. Existing `handleMenuCommand` and `onNewTerminal` code was refactored to call the extracted methods, eliminating duplication.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | Added `onOpenFromCli` listener; new `openFileFromPath`, `createTerminalTab`, `createNewFileTab` methods; refactored `handleMenuCommand 'new-file'` and `onNewTerminal` to use extracted methods |

### Implementation Details
- **`openFileFromPath`**: checks for an existing tab with matching `filePath` first — switches to it rather than opening a duplicate; handles image vs. text detection; loads file content into Monaco
- **`createTerminalTab(cwd?)`**: accepts an optional `cwd`; if omitted, inherits from the active terminal's cwd or workspaceRoot (matching prior `onNewTerminal` behaviour); `onNewTerminal` now delegates to this method
- **`createNewFileTab`**: extracted from `handleMenuCommand 'new-file'`; `handleMenuCommand` now delegates to it
- `onOpenFromCli` listener registered alongside `onMenuCommand` with `addCleanup` for proper teardown

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
