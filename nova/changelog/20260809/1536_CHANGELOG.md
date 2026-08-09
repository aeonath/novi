# Changelog — 2026-08-09 15:36

## Ad hoc: Fix crop handles that couldn't actually be grabbed to resize

### Summary
User reported the mspaint-style crop handles added in the 14:15 changelog
didn't work — "I cannot adjust the image with the side and top and bottom
buttons to crop like mspaint." Live in-app verification (Playwright) was
attempted but stopped at the user's request in favor of unit tests only.

Root cause, found by writing a jsdom test that dispatches real
`mousedown`/`mousemove`/`mouseup` DOM events at the actual handle elements
(rather than calling the private methods directly, which would have missed
this): each edge handle (north/south/east/west) was only a **10×10px square
positioned exactly on the border line**. The rest of that same edge — the
plain 2px border — had no resize listener at all; it was covered by the
crop-overlay body's own `mousedown` handler, which starts a **move** drag,
not a resize. So any grab that wasn't pixel-precise on the tiny square
midpoint just dragged the whole selection instead of resizing it — which is
exactly what "can't adjust with the side/top/bottom" describes. This
matches how MS Paint doesn't actually behave (its window-border-style
handles are far more forgiving), even though the drag *math* itself
(`computeCropHandleDrag`) was already correct and unit-tested.

### Fix
- Edge handles (n/s/e/w) are no longer a single small square at the
  midpoint. Each is now a **full-length invisible strip spanning the entire
  edge** (10px thick, like an OS window-resize border) with the correct
  resize cursor and its own `mousedown` → resize wiring. A small square
  marker still renders at the midpoint for visual affordance, but it's
  `pointer-events: none` — purely decorative; the strip beneath it is what's
  actually draggable, so a grab anywhere along the edge works.
- Corner handles (nw/ne/sw/se) stay as small squares (bumped 10px → 12px)
  and render after the edge strips so they take priority right at the
  corners, where the strips and corner squares overlap.
- Both handle types now carry a `data-crop-handle="<mode>"` attribute for
  reliable DOM lookup (previously tests had to sniff `style.top`/`style.left`,
  which is exactly what caused two false failures during the fix — see Test
  Results).
- Also fixed a genuine, unrelated pre-existing bug this work exposed:
  `handleSave()` checked `result.success` on the object `window.api.saveFile()`
  resolves with, but that object is `{path, size, modified}` — it has no
  `success` field, and the IPC handler throws (rejects) on failure rather
  than resolving falsy. So `isModified` was **never** cleared after a
  successful image Save, meaning the "(modified)" indicator never went away.
  This only surfaced now because `ImageEditor.ts` had never been imported by
  any Jest test before, so `ts-jest` had never type-checked it.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/ImageEditor.ts` | Split `CROP_HANDLES` into `CROP_CORNER_HANDLES` (small squares) and `CROP_EDGE_HANDLES` (full-length strips); `renderCropOverlay()` now renders a full-edge invisible strip + decorative midpoint marker per edge, then corner squares on top; added `data-crop-handle` attributes and a `.crop-overlay` class for stable DOM identification; fixed `handleSave()`'s dead `result.success` check |
| `src/tests/core-0.8.0/image-editor-crop-handles.test.ts` | New: 10 tests that mount a real `ImageEditor`, enter crop mode, and dispatch genuine DOM `mousedown`/`mousemove`/`mouseup` events at the actual handle elements — covering all 4 edges (including an off-center grab point to prove the wide hit area), a corner, move-after-resize, bounds clamping, and that a handle drag doesn't also trigger the pan-drag feature (propagation must stop) |

### Test Results
- 52 suites passed, 0 failed (778 tests, 10 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- Note on methodology: an initial version of the new test had 2 failures that
  turned out to be test bugs, not product bugs (an ambiguous `n`/`s` handle
  selector, and asserting vertical movement with zero vertical slack) — both
  fixed before this was treated as a real signal. Kept as documentation of
  why the `data-crop-handle` attribute was added: the earlier style-based
  selector was fragile enough to produce false signal in both directions
- Live in-app GUI testing (Playwright driver) was attempted for verification
  but stopped per user instruction ("just the unit tests"); no GUI test
  tooling was added to the repo

### Commit
TBD
