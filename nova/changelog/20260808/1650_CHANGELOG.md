# Changelog — 2026-08-08 16:50

## Ad hoc: Fix terminal tab not closing on `exit` — xterm WebGL addon dispose crash

### Summary
User reported that typing `exit` in a terminal tab still didn't close the
tab (previously "fixed" in commit `653a79a`, which corrected an un-awaited
`closeTab()` call but didn't address this). Screenshot showed a blank
terminal pane with the tab still present. Asked the user to check DevTools —
they found `Uncaught (in promise) Error: Cannot read properties of undefined
(reading '_isDisposed')` firing right after typing `exit`, plus two
`[TerminalService] Terminal <id> not found` errors in the main-process log.

Root cause, traced through the actual call chain (`terminal-exit` IPC →
`App.terminalOnExit` → `await tabBarAPI.closeTab()` → `TabBar.removeTab()`
→ `await onTabClose()` → `App.onTabClose` → `syncTerminalInstances()` →
`Terminal.destroy()` → `Terminal.onDestroy()` → `this.terminal.dispose()`):

xterm.js's `@xterm/addon-webgl` has a known internal ordering bug. When the
addon is loaded, it registers its own disposable (`WebglAddon.ts:90-97`)
that reads `terminal._core._store._isDisposed` when the addon is torn down.
By the time `xterm.Terminal.dispose()` reaches that disposable in its own
synchronous addon-cleanup walk, `_core._store` can already be `undefined`
(torn down by an earlier step in the same `dispose()` call) — throwing
`Cannot read properties of undefined (reading '_isDisposed')` **synchronously,
inside `dispose()`**. Confirmed `_isDisposed` is exclusively an xterm.js /
`addon-webgl` concept (`grep -rl "_isDisposed" node_modules/@xterm`) — not
ours.

That synchronous throw propagated straight up through
`Terminal.onDestroy()` → `App.syncTerminalInstances()` → `App.onTabClose()`
(an `async` function, so the throw became a **rejected promise**) →
`TabBar.removeTab()`'s `await onTabClose(tabId)`, which threw *before*
reaching the line that actually mutates `this.tabs` — so the tab was never
removed from TabBar's list. The rejection then surfaced further up through
`App.terminalOnExit`'s `await tabBarAPI.closeTab(...)`, with no catch
anywhere in the chain, ending up as an unhandled rejection inside the
`terminal-exit` IPC callback — exactly matching the console error's stack
(`onMessage`/`emit` in Electron's sandbox bundle calling into our handler).
The two "not found" log lines were a red herring — benign, already-caught
errors from the redundant `terminalKill()` call in `onTabClose` (killing an
already-dead PTY) and a stray final keystroke write racing the PTY's death;
neither of those throws.

Fix: wrap `terminal.dispose()` in `Terminal.ts` with try/catch (extracted
into a `disposeXterm()` helper used by both `onDestroy()` and
`restartTerminal()`), and also guard the WebGL addon's own
`onContextLoss(() => webglAddon.dispose())` callback, which has the same
double-dispose risk. Our tab-lifecycle logic should never be held hostage by
a third-party renderer's internal teardown bug — worst case now is a logged
console error instead of a permanently stuck tab.

Also removed one pre-existing dead variable (`wasActive` in the `isActive`
setter) — `tsc`'s `noUnusedLocals` rejected the new test file the moment it
imported `Terminal.ts` directly (nothing had before).

Verified the regression tests actually catch the bug: temporarily removed
the try/catch and confirmed 2 of 3 new tests failed with the exact
`_isDisposed` error propagating through `destroy()`/`restartTerminal()`,
then restored the fix and reran clean.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | Added `disposeXterm()` helper wrapping `this.terminal?.dispose()` in try/catch, used by both `onDestroy()` and `restartTerminal()`; guarded the WebGL addon's `onContextLoss` dispose callback the same way; removed dead `wasActive` variable in the `isActive` setter |
| `src/tests/core-0.8.0/terminal-dispose-guard.test.ts` | New: verifies `destroy()` and `restartTerminal()` never throw/reject even when the underlying xterm instance's `dispose()` throws (using the real, unmocked `Terminal` class and `@xterm/addon-webgl` import chain, with only the `terminal` field swapped for a throwing fake) |

### Test Results
- 44 suites passed, 0 failed (703 tests, 3 new)
- Manually confirmed the new tests fail against the reverted (unguarded) `disposeXterm()`, then pass again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
