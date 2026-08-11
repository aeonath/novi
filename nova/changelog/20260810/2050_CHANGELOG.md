# Changelog — 2026-08-10 20:50

## Ad hoc: Eagerly initialize background terminal tabs on startup

### Summary
User reported that on startup, a restored terminal tab that isn't the
active one stays uninitialized — its tab label just shows the generic
"bash" placeholder — until it's actually clicked. Asked to initialize any
open terminal tabs on startup instead of lazily on first click.

### Root cause
`Terminal.ts`'s PTY creation (`initPhase1()`) only ever ran once a tab
became active (`set isActive`: `if (active && !this.ptyCreated) {
this.initPhase1(); }`) — background tabs never got a PTY at all until
clicked. This was a known, deliberate tradeoff (several comments elsewhere
in `App.ts` already reference it — e.g. `loadWorkspace()`'s terminal-restore
loop pre-derives a tab name from the saved cwd specifically *because*
"terminalOnPwd... may never fire" for a tab that's never activated, and
`updateFileTreeDisplayRoot()` has a similar workaround for the loading
spinner). Since `deriveTerminalTabName()` only runs off a *saved* cwd, a
restored tab whose cwd was never actually captured in a previous session
(e.g. it was itself a background tab back then too, or was created and
never visited) falls back to the literal default label — "bash" — with no
way to ever correct itself without a PTY actually starting and reporting
its real cwd via OSC 7.

### Fix
Added `Terminal.initPtyEagerly()`: creates the PTY immediately for a
background tab, without needing the tab to become active first.
`initPhase1()`'s existing measurement flow can't be reused for this — it
waits on a `ResizeObserver` entry with non-zero dimensions to measure the
real terminal size, which a `display:none` container never produces (that
wait would hang forever). Instead, `initPtyEagerly()` skips measurement
entirely and creates the PTY with the same 100×30 fallback size
`initPhase1()` already falls back to for a degenerate measurement, then
leaves the real xterm display deferred — reusing the *existing*
`isActive` setter branch `active && this.ptyCreated && !this.terminal`
(originally written for "restart while the tab was hidden") to mount the
real display once the tab is actually shown. At that point `initDisplay()`'s
own `fitAddon.fit()` corrects the size from the 100×30 placeholder to the
container's real dimensions and sends a resize to the shell — the same
one-time corrective resize that already happens whenever a genuinely
different size is detected on first display, not a new code path.

`App.ts`'s `syncTerminalInstances()` now calls `initPtyEagerly()` for every
newly-created terminal instance that isn't the tab about to become active
(the active one still goes through the accurate measured-size path via
`syncTerminalActiveState()` → `isActive = true` → `initPhase1()`). Since a
terminal tab only ever exists without immediately being active via the
workspace-restore path, this transparently covers "every open terminal tab
gets initialized on startup" without needing any startup-specific code —
the existing `terminalOnPwd` listener (already global, not gated on active
state) picks up each background PTY's reported cwd and updates its tab
label exactly like it always has for the active tab.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | Added `initPtyEagerly()` — creates the PTY with a 100x30 fallback size for a background tab, deferring the real xterm display to the existing "PTY exists, display not yet created" activation path |
| `src/renderer/components/App.ts` | `syncTerminalInstances()` now calls `initPtyEagerly()` for every newly-created terminal instance other than the one about to become active |
| `src/tests/core-0.8.0/terminal-eager-pty-init.test.ts` | New file — 6 tests covering the fallback-size PTY creation, that the real xterm display stays deferred, the already-created/already-active no-op guards, and the failure path |

### Test Results
- 59 suites passed, 0 failed (902 tests, up from 896 — 6 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
