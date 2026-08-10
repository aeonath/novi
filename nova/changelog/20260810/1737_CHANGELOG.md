# Changelog — 2026-08-10 17:37

## Ad hoc: Fix hidden terminals getting destructively corrupted by a font size/family change

### Summary
User reported that after changing the default terminal font size in the new
Settings UI ([1730_CHANGELOG.md](./1730_CHANGELOG.md)), a *different*,
currently-hidden terminal tab came back garbled — text wrapped into short,
overlapping/scrambled lines with a cursor stuck in the wrong spot.

Root cause: `Terminal.ts`'s `fontSizeProp`/`fontFamilyProp` setters called
`fitAddon.fit()` unconditionally whenever a real `terminal`/`fitAddon`
existed, with no check for whether the terminal was actually visible. App.ts's
`syncTerminalActiveState()` assigns both props to **every** terminal
instance on every sync — not just the active one — which is exactly what
runs when the Settings panel's default font size/family changes (it did the
same for the pre-existing `fontSizeProp`/Ctrl+Shift+= font-zoom shortcut too,
but that path required an active terminal tab and was apparently never hit in
practice). A hidden tab's container is `display:none`, which ResizeObserver
reports as a 0x0 `contentRect`. `FitAddon.proposeDimensions()` doesn't bail
out on that — it clamps to `{cols: 2, rows: 1}`, and `fit()` calls
`terminal.resize(2, 1)`, which **destructively** reflows the entire
scrollback buffer down to a 2-column-wide terminal — permanently mangling it.
Re-showing the tab afterward can't undo it; the corruption already happened
the moment the setting changed while the tab was hidden. This is the exact
same failure mode already documented (and guarded against) on
`handleContainerResize()` for the persistent ResizeObserver — the two new
setters just reintroduced it via a separate code path.

### Fix
`Terminal.ts`:
- Factored the `fitAddon.fit()` + `onResize()` call out of both setters into
  a new `refitOrDefer()` helper. It only fits immediately while
  `this._isActive` is true (terminal actually on screen). While inactive, it
  sets a new `pendingFontRefit` flag instead of fitting, so the xterm option
  itself still updates live (so the terminal looks right the instant it's
  shown) but no destructive fit happens against a 0x0 container.
- `set isActive(true)` now checks `pendingFontRefit`: if a font change was
  deferred while hidden, it clears the flag and skips arming
  `suppressNextResize` — letting the persistent ResizeObserver's callback
  (triggered by the caller's own `display:none` → `flex` flip right before
  assigning `isActive`) actually run and recompute cols/rows against the
  container's real dimensions with the new font metrics. Normal activations
  (no pending font change) are unaffected — `suppressNextResize` is armed as
  before, preserving the existing no-resize-on-plain-tab-switch behavior.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | Added `pendingFontRefit` flag + `refitOrDefer()` helper used by both `fontSizeProp` and `fontFamilyProp`; `isActive` setter now consumes `pendingFontRefit` to let a deferred resize through instead of suppressing it |
| `src/tests/core-0.8.0/terminal-activate-no-resize.test.ts` | Updated the two existing "still fits and resizes" tests to explicitly set `_isActive = true` (now required); added tests for: deferred fit while inactive (both props), reactivation not arming `suppressNextResize` when a refit is pending, and an end-to-end test proving a font change made while hidden actually resizes once the tab is shown again |

### Test Results
- 57 suites passed, 0 failed (868 tests, up from 864 — 4 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
