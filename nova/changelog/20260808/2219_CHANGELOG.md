# Changelog — 2026-08-08 22:19

## Ad hoc: Remove application menu from window.open() popups

### Summary
User showed a screenshot of the popup window opened by Help > Documentation
(same mechanism as Report Issue) — it inherited the full native File/Edit/
View/Novi/Help menu bar, which doesn't apply to external content and whose
items don't work there (no active tab in that window's context).

No `setWindowOpenHandler` existed in `main.ts`, so `window.open()` calls
from the renderer used Electron's default popup-creation behavior, which
inherits `Menu.setApplicationMenu()`'s process-wide default menu for any
new window that doesn't have its own menu explicitly removed.

Fix: listen for `did-create-window` on the main window's `webContents`
(fires after any successful `window.open()`-driven window creation,
regardless of whether a custom open handler exists) and call
`childWindow.removeMenu()` on it.

### Files Changed

| File | Change |
|------|--------|
| `src/main/main.ts` | Added a `mainWindow.webContents.on('did-create-window', ...)` listener that calls `removeMenu()` on any window opened via `window.open()` |

### Test Results
- 48 suites passed, 0 failed (724 tests — no new test; `main.ts`'s window-lifecycle code has no existing test harness in this codebase and mocking Electron's `BrowserWindow`/`webContents` for one `removeMenu()` call would be disproportionate, consistent with prior main-process-level changes this session)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
