# Changelog — 2026-08-09 00:24

## Ad hoc: Suppress the persistent ResizeObserver's own fire on tab activation

### Summary
Second follow-up to the terminal-freeze-on-tab-switch fix (23:58 and 00:15
entries). User confirmed via screenshots that switching back to a terminal
tab still briefly flashed the old scrollback content, then cleared it down
to a bare prompt — even after the duplicate observer (23:58) and the
`fontSizeProp` no-op guard (00:15) were both fixed.

Root cause: the remaining, *persistent* `ResizeObserver` (set up once in
`initDisplay()`, meant to react to genuine future container resizes) itself
still fires on tab activation. The container's `display: none -> flex` flip,
done by `App.ts` right before assigning `isActive = true`, is a real size
change from the observer's point of view — it goes from a 0x0 contentRect to
the container's actual size. That fired `fitAddon.fit()` +
`onResize()` (a SIGWINCH to the shell) purely as a side effect of switching
back to the tab. On Windows/conpty, a resize signal can cause the whole
console buffer to repaint, which is exactly what looked like a flash of the
old content followed by it being cleared down to a fresh prompt.

Fix: added a `suppressNextResize` flag. `set isActive(true)` arms it before
anything else runs; the persistent `ResizeObserver`'s callback checks it
first and, if armed, disarms it and returns without calling `fitAddon.fit()`
or `onResize()` at all — skipping exactly the one callback caused by this
activation. Any subsequent resize that happens while the tab is already
active and visible (window resize, sidebar drag, etc.) is unaffected, since
the flag is only re-armed by activation, never by a normal resize event.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | New `suppressNextResize` field; `set isActive(true)` arms it; the persistent `ResizeObserver` callback in `initDisplay()` checks and disarms it as its first statement, skipping `fitAddon.fit()`/`onResize()` entirely when armed |
| `src/tests/core-0.8.0/terminal-activate-no-resize.test.ts` | New: activation arms `suppressNextResize`; deactivation does not arm it; re-activation re-arms it every time |

### Test Results
- 50 suites passed, 0 failed (752 tests, 2 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
