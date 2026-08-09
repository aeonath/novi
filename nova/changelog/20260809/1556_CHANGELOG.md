# Changelog — 2026-08-09 15:56

## Ad hoc: Make crop handles always visible on the image (mspaint canvas-resize model)

### Summary
Follow-up to the 15:36 fix. User clarified the actual ask with a side-by-side
screenshot of MS Paint: Paint doesn't require entering a "Crop" mode first —
the white square handles sit on the image's border at all times, and
dragging one directly resizes the canvas. Our implementation still required
clicking a "Crop" button before any handle appeared, which is why "there are
no sliders on the sides" — none render until that click.

### Changes
- Removed the "Crop" / "Apply Crop" / "Cancel" toolbar buttons and the
  `cropMode` state gate entirely. The 8 handles (4 edges + 4 corners) now
  render on the image's border continuously, any time an image is loaded —
  matching the reference screenshot exactly.
- `cropRegion` now always mirrors the full current image and is resynced
  (`resetCropRegion()`) every time `this.dims` changes: after load, resize,
  crop-commit, undo, redo, and reset.
- Dragging a handle live-previews a smaller region (border + dimming now
  only appear while the region differs from the full image, so a
  freshly-loaded image shows plain white handles with no dimming, like
  Paint). **Releasing the handle commits the crop immediately** — no
  "Apply"/confirm step, matching Paint's direct-manipulation canvas resize.
  It's still undoable via the existing Ctrl+Z history.
- Removed the crop-overlay's "drag the body to move the selection" behavior
  — Paint's canvas-resize handles don't support that either, and keeping it
  would have meant the always-present overlay (now covering the whole image
  by default) intercepted every plain click, breaking the click-drag-to-pan
  feature added earlier today. The overlay box itself is now
  `pointer-events: none`; only the handles/strips are interactive, so a
  plain drag on the image still pans it.
- A release that didn't actually shrink/grow the region (e.g. an accidental
  click) is a no-op — no `cropImage()` call, no history entry.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/ImageEditor.ts` | Removed `cropMode`, `cropPreviewUrl`, the Crop/Apply Crop/Cancel toolbar buttons, `handleCropClick`/`handleCropCancel`/`handleCropApply`/`showCropPreviewDialog`/`handleCropConfirm`, and the crop-hint banner. Added `resetCropRegion()` (called from `loadImage`, `handleResizeApply`, `handleUndo`, `handleRedo`, `handleReset`) and `commitCrop()` (called automatically from `handleCropInteractionUp` on a real change). `renderCropOverlay()` now always renders when `this.dims` exists, only shows the border/dimming/size-label when the region isn't the full image, and sets the overlay's own box to `pointer-events: none` so plain image clicks fall through to the pan handler |
| `src/tests/core-0.8.0/image-editor-crop-handles.test.ts` | Rewritten for the new model: handles present immediately (no button click), no "Crop"/"Apply Crop" buttons exist, edge/corner drags live-preview correctly, mouseup calls the (mocked) `cropImage` with the right region and auto-commits without a dialog, a handle drag doesn't trigger panning, a plain image-interior drag pans instead of moving the crop region, bounds clamping, and a no-movement release is a no-op |

### Test Results
- 52 suites passed, 0 failed (780 tests)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- Per user instruction, verification is unit-test only — no GUI/Playwright tooling used or added

### Commit
TBD
