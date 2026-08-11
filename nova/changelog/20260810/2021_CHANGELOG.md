# Changelog — 2026-08-10 20:21

## Ad hoc: Fix F11 fullscreen, remove app-window zoom shortcuts, default New Terminal to Ctrl+T

### Summary
User reported F11 (fullscreen), Zoom In, Zoom Out, and Reset Zoom all not
working in the Novi keyboard-shortcuts section, and asked to remove the zoom
options entirely ("who cares") while fixing fullscreen for real. Also asked
to change New Terminal's default binding to `Ctrl+T`.

### Root cause
`App.ts`'s `handleMenuCommand` called `window.api?.toggleFullScreen?.()`,
`window.api?.zoomIn?.()`, `window.api?.zoomOut?.()`, and
`window.api?.zoomReset?.()` — but **none of these four IPC methods existed**
anywhere in `preload.ts` or `main.ts`. The optional-chaining calls silently
no-op'ed instead of throwing, so pressing F11 or the zoom shortcuts did
nothing with no error to explain why. This wasn't a shortcut-binding bug —
the main-process implementation was simply never built.

### Changes
- **F11 fullscreen — implemented for real**: added a `window-toggle-fullscreen`
  IPC handler in `main.ts` (`mainWindowRef.setFullScreen(!mainWindowRef.isFullScreen())`,
  same style as the existing `window-minimize`/`window-maximize`/`window-close`
  handlers), exposed as `window.api.toggleFullScreen()` via `preload.ts`, and
  typed in `global.d.ts`. `App.ts`'s existing `case 'toggle-fullscreen'` call
  site needed no change — it was already calling the right (previously
  nonexistent) method name.
- **Zoom In / Zoom Out / Reset Zoom — removed entirely**, per the user's call
  (app-window zoom, not editor/terminal font size — that's a separate,
  already-working feature under a different accelerator):
  - Removed the three `ShortcutDef` entries from `NOVI_SHORTCUTS`
    (`shortcut-registry.ts`) — this alone also drops them from the Settings →
    Keyboard Shortcuts sub-tab, which renders that list dynamically.
  - Removed the `'zoom-in' | 'zoom-out' | 'zoom-reset'` members from
    `menu.ts`'s `MenuCommand` type and their three "Zoom In" / "Zoom Out" /
    "Reset Zoom" View-menu items.
  - Removed the three corresponding `case` branches from `App.ts`'s
    `handleMenuCommand`. Since the `window.api.zoomIn/zoomOut/zoomReset`
    methods never existed in the first place, there was nothing to remove
    from `preload.ts`/`main.ts`/`global.d.ts`.
- **New Terminal default → `Ctrl+T`**: changed `new-terminal`'s
  `defaultAccelerator` from `` CmdOrCtrl+` `` to `CmdOrCtrl+T` in
  `shortcut-registry.ts`. No accelerator collision with any other registered
  shortcut. Incidentally, `TitleBar.ts`'s in-app View-menu display label for
  New Terminal already (incorrectly) said "Ctrl+T" — this change makes the
  real default match what was already being shown there.

### Files Changed

| File | Change |
|------|--------|
| `src/main/main.ts` | Added `ipcMain.on('window-toggle-fullscreen', ...)` handler |
| `src/preload/preload.ts` | Exposed `toggleFullScreen()` |
| `src/types/global.d.ts` | Typed `window.api.toggleFullScreen` |
| `src/core/shortcuts/shortcut-registry.ts` | Removed `zoom-in`/`zoom-out`/`zoom-reset` from `NOVI_SHORTCUTS`; changed `new-terminal`'s default accelerator to `CmdOrCtrl+T` |
| `src/main/menu.ts` | Removed `zoom-in`/`zoom-out`/`zoom-reset` from `MenuCommand` and the View menu's three zoom items |
| `src/renderer/components/App.ts` | Removed the three zoom `case` branches from `handleMenuCommand` |

### Test Results
- 58 suites passed, 0 failed (894 tests — unchanged; no test in this suite
  referenced the removed zoom commands or the old New Terminal default, and
  `main.ts`/`menu.ts` have no existing test coverage in this codebase to
  extend for the new fullscreen handler)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
