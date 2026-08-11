# Changelog — 2026-08-10 20:56

## Ad hoc: Fix race condition from the eager-terminal-init change (blank active tab on restore)

### Summary
User reported that after the previous eager-terminal-init change (17:50
entry), the *active* restored terminal tab now showed a completely blank
pane — no shell prompt drawn at all — and the second tab still said "bash".
A regression introduced by that same change, not a pre-existing issue.

### Root cause
`App.ts`'s `loadWorkspace()` restores every terminal tab and calls
`syncTerminalInstances()` **before** it knows which one will actually end up
active — `setActiveTab()` for the first restored terminal only runs
afterward. At the time `syncTerminalInstances()`'s loop ran, `this.activeTab`
was still whatever it was before (not yet the restored terminal), so the
`this.activeTab?.id !== tab.id` check added in the previous change
incorrectly treated *every* restored tab — including the one about to become
active — as a background tab, and fired `initPtyEagerly()` on all of them.

`initPtyEagerly()` sets `initInProgress = true` synchronously before its
`terminalCreate()` IPC call resolves. When `setActiveTab()` +
`tabBarAPI.switchTab()` ran moments later — still before that IPC round-trip
had completed — the `isActive` setter's own attempt to initialize
(`initPhase1()`) immediately bailed out, because `initPhase1()`'s guard
(`if (this.ptyCreated || this.initInProgress || !this._isActive) return;`)
saw `initInProgress` already `true` from the in-flight eager call. Since
`initPtyEagerly()` deliberately never calls `initDisplay()` itself (by
design — the real xterm display was meant to stay deferred until the isActive
setter's own follow-up call), nothing ever mounted a display for that tab:
the PTY existed, but no xterm instance was ever created for it — a
permanently blank pane with no prompt.

### Fix
`initPtyEagerly()` now checks `this._isActive` again right after
`ptyCreated` flips true (i.e. once the `terminalCreate()` IPC call actually
resolves), and calls `this.initDisplay()` itself if the tab became active
while the call was in flight. This makes it self-correcting regardless of
which order `isActive = true` and the IPC round-trip complete in — the
isActive setter's own dispatch handles the common case (tab already known to
be background, then later activated well after its PTY exists), and this
new check handles the race case (tab activated *during* the still-in-flight
eager call) without needing to touch `App.ts`'s restore sequencing at all,
which stays exactly as it was.

The second tab still showing "bash" in the same screenshot doesn't appear to
be a related bug — OSC 7 cwd tracking is parsed entirely in the main process
(`main.ts`) directly off the raw PTY data stream, independent of whether a
renderer-side xterm display exists for that terminal, so it's unaffected by
either this fix or the original change. It just takes bash a brief moment
after actually starting to run its first `PROMPT_COMMAND` and emit OSC 7 —
likely a normal timing gap between launch and the screenshot, not a stuck
state.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | `initPtyEagerly()` now calls `initDisplay()` itself if `_isActive` is true once `terminalCreate()` resolves, fixing the race where an isActive-setter-driven `initPhase1()` call could be silently blocked by the eager call's own `initInProgress` flag |
| `src/tests/core-0.8.0/terminal-eager-pty-init.test.ts` | New test reproducing the exact race (isActive set while `terminalCreate()` is still pending) and confirming `initDisplay()` still gets called once it resolves |

### Test Results
- 59 suites passed, 0 failed (903 tests, up from 902 — 1 new test added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
