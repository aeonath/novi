# Changelog — 2026-08-09 14:15

## Ad hoc: Replace broken "zoom" buttons with real zoom + mspaint-style crop handles

### Summary
User reported the image editor's zoom buttons "do not work right" and asked
for them to be replaced with a −/+ zoom control plus an editable percentage
box, and for mspaint-style crop handles on the image edges/corners that can
be dragged to crop.

Root cause of the "zoom buttons": what the toolbar labeled 50%/75%/150%/200%
were not view-zoom controls at all — `handleQuickScale()` actually called
`resizeImage()` and pushed a new undo/history entry, i.e. clicking "150%"
**destructively upscaled the real image data** and marked the file modified,
instead of just changing the on-screen magnification. That's why it "didn't
work right": it looked like a zoom control but behaved like a lossy resize.

Also fixed two correctness bugs found while reworking crop, both of which
would have made the new drag-handles produce wrong crops:
1. The old click-drag-to-draw crop region was recorded in *displayed* pixel
   coordinates (from `imgEl.getBoundingClientRect()`), but the image element
   was rendered shrink-to-fit (`maxWidth/maxHeight: 100%`), so those
   coordinates didn't match the image's actual pixel grid whenever the
   display size differed from natural size (i.e. almost always for a
   non-trivially-sized image, and *always* once real zoom exists).
2. `handleCropApply()` cropped from `this.originalDataUrl` (the file as
   originally opened) instead of `this.imageUrl` (the current, possibly
   already-resized state), so cropping after a resize would apply
   current-size coordinates to the original-size raster.

### Changes
- **Zoom**: removed the destructive 50/75/150/200% buttons. Added `−` / `+`
  buttons and an editable percentage input (10%–400%, step 25% per click).
  Zoom is now purely a display transform — `imgEl` is sized explicitly to
  `naturalDims * viewZoom` px and the underlying image data is never
  touched. Resets to 100% on new image load and on Reset. When the zoomed
  image is larger than the viewport, the viewport anchors to the top-left
  instead of centering (centering an overflowing flex child makes part of
  the overflow unreachable by scroll).
- **Crop handles**: entering Crop now starts with the full image selected
  (mspaint-style) with 8 draggable handles (4 edges + 4 corners) plus
  drag-to-move on the selection body, replacing the old
  draw-a-rectangle-from-scratch interaction. Crop region is tracked in
  natural image-pixel coordinates so it stays correct at any zoom level, and
  `handleCropApply()` now crops from the current image state.
- Extracted the crop-handle math (`computeCropHandleDrag`) and zoom clamping
  (`clampZoom`) into `src/core/image/image-utils.ts` as pure, unit-tested
  functions, following the existing pattern for `scaleDimensions` /
  `calculateProportionalDimensions` in that file.
- Drag tracking moved to window-level `mousemove`/`mouseup` listeners so a
  fast drag that leaves the small handle elements doesn't drop the
  interaction.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/ImageEditor.ts` | Removed destructive quick-scale buttons/handler; added view-only zoom state, toolbar `−`/percentage-input/`+` controls, zoom-aware image sizing and viewport anchoring; reworked crop from click-drag-a-new-rectangle to mspaint-style handle dragging (8 handles + move), crop region now in natural pixel coords; `handleCropApply()` crops from current image state instead of the original file |
| `src/core/image/image-utils.ts` | Added `CropRegion`/`CropHandleMode` types and pure `computeCropHandleDrag()` + `clampZoom()` helpers |
| `src/tests/core-0.8.0/image-editor-zoom-crop.test.ts` | New: 14 tests covering all 8 crop-handle drag directions (move, edges, corners), bounds clamping, minimum-size clamping, and zoom clamping |

### Test Results
- 51 suites passed, 0 failed (768 tests, 14 new)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- `npm run lint`: confirmed zero new lint errors/warnings introduced by this change (diffed against the pre-change lint output for the touched files — identical pre-existing findings only)

### Commit
TBD
