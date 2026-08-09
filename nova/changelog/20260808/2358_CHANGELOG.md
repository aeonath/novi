# Changelog — 2026-08-08 23:58

## Ad hoc: Freeze terminal display on tab switch — remove duplicate resize-on-activate

### Summary
User reported terminal tabs losing their display, with prompts getting
"jacked up" and on-screen content disappearing every time they switched
tabs and switched back. Asked explicitly: terminal tabs should freeze
their display when they lose focus, not get re-resized.

Root cause: two *independent* `ResizeObserver` instances were both
watching the same terminal container and could both react to the exact
same event — a tab's container flipping from `display: none` to `flex` on
activation, which is a genuine size change from the observer's point of
view.

1. A **persistent** observer, set up once in `initDisplay()`, correctly
   handles any real container resize for the lifetime of the terminal
   (comment there already says as much: "reacts to genuine future
   container size changes").
2. A **second, temporary** observer used to be created fresh inside `set
   isActive(true)` on *every single tab activation*, doing the exact same
   `fitAddon.fit()` + compare-old/new-cols/rows + `onResize()` (a SIGWINCH
   to the shell) dance, then disconnecting itself.

Both observers fire off the same underlying container size change when a
tab becomes visible again. Since they're separate `ResizeObserver`
instances, their callbacks can run in different browser paint/layout
ticks and each independently call `fitAddon.fit()` — which mutates the
*same* shared xterm instance's dimensions as a side effect — so the two
measurements aren't guaranteed to agree if layout hadn't fully settled
between them. When they disagree, the shell gets **two** close-together
resize signals with different column counts, each triggering its own
prompt redraw/reflow — exactly the observed prompt corruption and dropped
content on every tab switch.

Fix: removed the temporary per-activation observer entirely. Activating a
tab now only restores scroll position and keyboard focus
(`terminal.scrollToBottom()` / `terminal.focus()`) — it no longer touches
sizing at all. The persistent observer alone already correctly handles
genuine resizes (including this same display:none→flex transition), so
nothing is lost; a tab's terminal now stays exactly as it was while
hidden ("frozen") unless its actual on-screen size changed. Also removed
the now-fully-redundant `hasInitialFit` field (it and `isReady` were
always toggled together in lockstep — `isReady` alone already carries the
same signal, and `hasInitialFit`'s only reader was the block just deleted).

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | `set isActive()`'s activation block no longer creates a `ResizeObserver` or calls `fitAddon.fit()`/`onResize()` — only `scrollToBottom()`/`focus()`; removed the now-dead `hasInitialFit` field and its two write sites (`restartTerminal()`, `initDisplay()`) |
| `src/tests/core-0.8.0/terminal-activate-no-resize.test.ts` | New: verifies activating a ready terminal calls neither `fitAddon.fit()` nor `onResize()`, still restores scroll/focus, does nothing before the terminal is ready, and does nothing on deactivation |

### Test Results
- 50 suites passed, 0 failed (748 tests, 4 new)
- Manually confirmed the primary new test fails when the old per-activation refit/resize logic is reintroduced, then passes again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
