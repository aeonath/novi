# Changelog — 2026-08-11 01:24

## Ad hoc: Restore terminal scrollback history across sessions

### Summary
User requested that, when "Restore Previous Session" is checked, each
terminal tab's *scrollback content* — not just its shell/cwd — comes back
on the next launch. Each tab's buffer is serialized and saved to a file on
exit, then replayed into the corresponding restored tab.

### Implementation

**Capturing the buffer**: Installed `@xterm/addon-serialize` (the official
xterm.js addon for exactly this) alongside the existing FitAddon/WebglAddon
in `Terminal.ts`'s `initDisplay()`. `Terminal.serializeHistory()` calls
`serializeAddon.serialize({ scrollback: this.scrollback })`, returning the
buffer as ANSI-formatted text (bounded by the terminal's own Scrollback
setting — max 200k lines per the earlier change, comfortably under the "up
to 250k is fine" the user gave as a ceiling). Exposed as `serialize()` on
the existing per-tab `window.__terminalAPI[id]` object, alongside `write`/
`copy`/etc.

**Saving on exit**: `App.ts` had no prior hook for "the app is actually
quitting" — workspace state only ever saved via a 1s-debounced
`saveWorkspaceDebounced()`, adequate for that but not something to trust for
potentially-large scrollback dumps. Added a real quit-time round trip:
- `main.ts` now intercepts `mainWindow`'s `'close'` event (a second listener
  alongside the existing `saveBounds` one) — but only when the `keeptabs`
  ("Restore Previous Session") setting is on. It calls
  `event.preventDefault()`, sends `'request-terminal-history-for-quit'` to
  the renderer, and waits (via a one-shot `ipcMain.once` reply, with a 3s
  timeout fallback so a gone/unresponsive renderer can never block quitting
  forever) before calling `mainWindow.close()` a second time — which then
  proceeds normally since the flag guarding re-entry is now set.
- `App.ts` responds by first `await`ing an immediate (non-debounced)
  `saveWorkspace()` — so the workspace file and the history files below
  reflect the exact same tab-list snapshot — then serializing every open
  terminal (via each tab's `__terminalAPI[id].serialize()`) in
  `this.terminalTabs`' own order, and sending the array back.

**Storage**: New `TerminalHistoryService` (main process,
`~/.novi/terminal-history/`), one file per tab named by its *index* in the
tab list at save time (`terminal-0.hist`, `terminal-1.hist`, ...) rather
than by terminal ID — IDs are regenerated on every restore, but tab order
is already exactly how `loadWorkspace()`'s restore loop correlates a saved
`openTerminals` entry to its newly-created tab (see the existing
`oldToNewTabId` map), so history files reuse that same correlation for
free. Every save also prunes any leftover `terminal-N.hist` files at or
beyond the new tab count, so a session with fewer tabs than a previous one
doesn't leave stale history lying around. `workspace-clear` ("Clear
Workspace") now also wipes all saved terminal history.

**Restoring**: `loadWorkspace()`'s terminal-restore loop now calls
`window.api.terminalHistoryLoadAll(count)` once up front and threads
`initialHistory` through to each new `Terminal` instance's config.
`Terminal.ts`'s `initDisplay()` writes it into the freshly-opened xterm
instance immediately after `terminal.open()` — before `registerAPI()`'s
flush of any live PTY output that arrived early — followed by a dim
"─── restored previous session ───" separator, so restored history always
appears first and never interleaves with fresh shell output. Consumed once
(cleared after writing) so it's never replayed again on a later reactivation.

### Files Changed

| File | Change |
|------|--------|
| `package.json` / `package-lock.json` | Added `@xterm/addon-serialize@^0.14.0` |
| `src/renderer/components/Terminal.ts` | Added `initialHistory` config + `serializeHistory()`; loads `SerializeAddon`; writes restored history (+ separator) right after `terminal.open()` in `initDisplay()`; exposes `serialize` on `__terminalAPI[id]` |
| `src/renderer/components/App.ts` | `terminalTabs` gained `initialHistory`; new `onRequestTerminalHistoryForQuit` handler (flushes workspace state, serializes every tab, sends the batch back); restore loop now calls `terminalHistoryLoadAll()` and threads results into each new `Terminal` |
| `src/main/services/terminal-history-service.ts` | New file — `saveAll()`/`loadAll()`/`clearAll()`, index-named files under `~/.novi/terminal-history/` |
| `src/main/main.ts` | Imports the new service; intercepts `mainWindow`'s `'close'` (gated on `keeptabs`, with a timeout fallback) to flush history before quitting; new `terminal-history-load-all` IPC handler; `workspace-clear` now also clears terminal history |
| `src/preload/preload.ts`, `src/types/global.d.ts` | New `terminalHistoryLoadAll`/`terminalHistorySaveAndQuit`/`onRequestTerminalHistoryForQuit`/`removeRequestTerminalHistoryForQuitListener` |
| `src/tests/core-0.4.0/terminal-history-service.test.ts` | New file — 9 tests for `TerminalHistoryService` |
| `src/tests/core-0.8.0/terminal-history.test.ts` | New file — 5 tests for `Terminal.serializeHistory()` and the `initialHistory` config option |

### Test Results
- 62 suites passed, 0 failed (935 tests, up from 921 — 14 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- Not verified end-to-end in the real app (would require actually quitting
  and relaunching Novi with tabs open) — left for the user to confirm on
  next launch, per their stated preference to do in-app verification
  themselves

### Commit
TBD
