# Changelog — 2026-08-11 02:00

## Ad hoc: Fix restored terminal history dropping on-screen content

### Summary
User tested the terminal-history restore feature (previous entry, 01:24):
scrollback that had already scrolled off-screen came back correctly, but
content that was still visible on-screen at quit time (they specifically
tested `ps` and `ls` output) did not.

### Root cause
`Terminal.ts`'s `initDisplay()` wrote `initialHistory` into the terminal
*immediately after* `terminal.open(this.container)` — before
`fitAddon.fit()` had resized it from xterm's default startup size to the
container's real dimensions (that resize only happens later, inside a
`requestAnimationFrame` callback). So potentially thousands of lines of
restored history got written into a terminal still at the wrong size, and
the very next thing that happened was `fit()` resizing it — which reflows
the entire buffer to match the new column width. That reflow is exactly
what corrupted/dropped the most-recently-written rows (the tail end of what
I'd written, right before the cursor) — i.e. whatever represented "the
current screen" — while older scrollback further back in the buffer wasn't
affected the same way.

This is the same general class of bug already documented elsewhere in this
file for *live* PTY output (`handleContainerResize()`'s comment on
destructive resizes, and `clearEarlyTerminalData()` discarding a stale
buffered prompt for the same reason) — writing into a not-yet-correctly-sized
terminal and then resizing it is destructive. My restored-history write just
reintroduced the same hazard via a new path that wasn't covered by the
existing safeguards, since those only guarded the *live* PTY data.

### Fix
Moved the `initialHistory` write from right after `terminal.open()` to
inside the `requestAnimationFrame` callback, *after* `fitAddon.fit()` has
resized the terminal to its real dimensions — still before `registerAPI()`
(which flushes the live shell's own early-buffered output), so restored
history still always appears above the live session, never interleaved with
it. Now the terminal is at its final size before any of the restored
content is ever written into it, so there's no later reflow to corrupt it.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | Moved the `initialHistory` write in `initDisplay()` from immediately after `terminal.open()` to after `fitAddon.fit()` inside the `requestAnimationFrame` callback |

### Test Results
- 62 suites passed, 0 failed (935 tests — unchanged; the existing
  `terminal-history.test.ts` tests `serializeHistory()` and the
  `initialHistory` config field directly against a fake `serializeAddon`,
  not the real `initDisplay()` write-ordering, which needs a real xterm
  mount that no test in this file attempts, consistent with the rest of
  `Terminal.ts`'s test suite)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- Not re-verified end-to-end (same as the original feature) — worth another
  quit/relaunch test to confirm `ps`/`ls` output now survives

### Commit
TBD
