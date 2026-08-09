# Changelog — 2026-08-09 00:29

## Ad hoc: Stop destructive buffer reflow when a terminal tab is hidden

### Summary
Third follow-up (23:58, 00:15, 00:24 entries) to the terminal-freeze-on-tab-
switch saga. User provided a screenshot showing the prompt/history actually
scrambled into overlapping garbage (`ET:work/  :` repeated, `Aeonath@SONN`
truncated mid-word) after switching back to a tab — not just a visual
flash/clear, but permanently corrupted content. Correctly identified this as
still unresolved despite the prior two fixes.

Root cause, found by reading `node_modules/@xterm/addon-fit`'s actual
`proposeDimensions()` source: it does **not** bail out when the container
has zero size (which is exactly what happens the instant a tab is hidden via
`display:none`). It clamps the result to `Math.max(2, ...)` columns and
`Math.max(1, ...)` rows, i.e. it happily returns `{cols: 2, rows: 1}` for a
0×0 container. `fit()` then unconditionally calls `terminal.resize(2, 1)`
whenever that differs from the current size — and xterm's `resize()`
**destructively reflows the entire scrollback buffer** to the new (bogus)
width and clears the render service. That reflow is not visual-only and not
reversible: once the buffer has been rewrapped to 2 columns, the original
80-column lines are gone. Re-activating the tab afterward — which is all
the previous two fixes addressed — could not undo damage that already
happened at the moment the tab was hidden.

This explains why the 00:24 fix (suppress the observer's fire on
*activation*) did not fully solve it: the persistent `ResizeObserver` was
still firing — and calling `fitAddon.fit()` — on *deactivation*, since a
container going `display:flex -> none` is just as much a "resize" to 0×0 as
the reverse.

Fix: the ResizeObserver's callback (extracted into a named
`handleContainerResize()` method for testability) now refuses to call
`fitAddon.fit()` at all unless `this._isActive` is true — i.e. unless the
container is actually on screen with real dimensions. A hidden tab's
container size changes are now completely ignored, so its buffer is never
touched while hidden. This is the literal "never repaint/never touch this
tab while it's not the one on screen" behavior that was asked for.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | Extracted the ResizeObserver's inline callback into `private handleContainerResize()`; added an `if (!this._isActive) return;` guard before any `fitAddon.fit()` call, with a comment explaining FitAddon's zero-size clamp-to-{2,1} behavior and the resulting destructive reflow |
| `src/tests/core-0.8.0/terminal-activate-no-resize.test.ts` | New: `handleContainerResize()` does not fit()/resize while inactive (the actual corruption source); still fits/resizes correctly on a genuine resize while active |

### Test Results
- 50 suites passed, 0 failed (754 tests, 2 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
