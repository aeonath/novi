# Changelog — 2026-08-09 16:08

## Ad hoc: Auto-fit image zoom to the window on load, so scrollbars only appear once you zoom in

### Summary
Following the zoom/crop rework, images always opened at a flat 100% —
larger-than-window photos immediately showed scrollbars even though the
user hadn't zoomed in at all. User asked for the image to auto-scale to fit
the window on open, with the actual fitted percentage reflected in the zoom
box, and no scrollbars unless they deliberately zoom in past that.

### Changes
- Added `applyAutoFit()`: computes `fit = min(1, availableWidth / imageWidth,
  availableHeight / imageHeight)` from the viewport's actual laid-out size
  (minus its 20px padding on each side) and sets `viewZoom` to it — capped
  at 1.0 so small images are never artificially upscaled, only ever shrunk
  to fit. Runs once dimensions are known after opening an image.
- Added an `autoFit` flag: true from load until the user manually changes
  zoom (+/−/typing a percentage), at which point it flips false and their
  chosen zoom is left alone. `handleReset()` flips it back to true and
  re-fits, since Reset already reverts other view state.
- Added a `ResizeObserver` on the viewport (guarded for jsdom, which doesn't
  implement it) that re-runs `applyAutoFit()` whenever the viewport's actual
  size changes — window resize, sidebar toggle, or the tab becoming visible
  after being hidden — as long as the user hasn't taken manual control of
  zoom. This is also what makes the *initial* fit correct even if the image
  tab was hidden (0×0) when dimensions first resolved.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/ImageEditor.ts` | Added `autoFit` flag and `VIEWPORT_PADDING` constant; added `applyAutoFit()`; wired it into `loadImage()` (after dims resolve) and `handleReset()`; `setZoom()` now clears `autoFit`; `onMount()` now observes `viewportEl` with a `ResizeObserver` (no-op if unavailable, e.g. in jsdom tests) |
| `src/tests/core-0.8.0/image-editor-auto-fit.test.ts` | New: 5 tests — shrinks a large image to fit and shows the right percentage, never upscales a small image past 100%, a manual zoom survives a later simulated resize, Reset snaps back to the fitted zoom, and a not-yet-laid-out (0×0) viewport safely falls back to 100% instead of dividing by zero |

### Test Results
- 53 suites passed, 0 failed (785 tests, 5 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- Per user instruction, verification is unit-test only — no GUI/Playwright tooling used or added

### Commit
TBD
