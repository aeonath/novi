# Changelog — 2026-08-09 00:15

## Ad hoc: Fix terminal content flashing then clearing on tab switch-back

### Summary
Follow-up to the 2026-08-08 23:58 fix (removing the duplicate per-activation
`ResizeObserver`). User reported that switching back to a terminal tab still
briefly flashed its content on screen, then cleared it — the display was
still not staying frozen.

Root cause: a *second*, independent resize path outside the
`ResizeObserver`s. `App.ts`'s `syncTerminalActiveState()` runs on every tab
switch and unconditionally assigns `entry.instance.fontSizeProp =
this.terminalFontSize` to every terminal instance (not just the one being
activated). `Terminal.fontSizeProp`'s setter had no guard against the
incoming value being identical to the current font size — it always called
`fitAddon.fit()` + `onResize()` (a SIGWINCH to the shell) regardless.

So on every tab switch, immediately after the container's `display:
none -> flex` flip (in the same synchronous tick, before layout necessarily
settled to the container's final size), the just-activated terminal got an
extra, spurious `fit()` + resize call with a potentially bogus col/row
count — corrupting/clearing the content that had just flashed into view.

Fix: `fontSizeProp`'s setter now no-ops when the incoming size equals the
terminal's current `fontSize`, so re-assigning the same value (as happens on
every tab switch) does nothing. A genuine font-size change (increase/decrease
font size commands) still differs from the cached value and still fits +
resizes as before.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | `set fontSizeProp()` returns early if `size === this.fontSize`, before touching `terminal.options`, `fitAddon.fit()`, or `onResize()` |
| `src/tests/core-0.8.0/terminal-activate-no-resize.test.ts` | New: re-assigning the same `fontSizeProp` value does not fit/resize; assigning a genuinely different value still does |

### Test Results
- 50 suites passed, 0 failed (750 tests, 2 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
