# Changelog — 2026-08-09 14:57

## Ad hoc: Dark-theme the image viewport scrollbars and add click-drag panning

### Summary
Follow-up to the 14:15 zoom/crop rework. User pointed out two remaining
issues from a screenshot: the image viewport's scrollbars were rendering as
default light OS scrollbars instead of matching the app's dark theme, and
now that zooming past 100% can make the image larger than the viewport,
there was no way to drag the image around to see the parts that scrolled
out of view.

### Changes
- **Scrollbars**: added an `.image-viewport-scroll` class + matching
  `::-webkit-scrollbar` rules to `index.html`, following the exact pattern
  already used for the file tree, Monaco, the terminal, and the tab bar
  (14px, `rgba(121,121,121,0.4)` thumb, `rgba(100,100,100,0.7)` on hover,
  transparent track/corner). Applied the class to the image editor's
  viewport element.
- **Click-drag panning**: left-click-drag on the image now scrolls the
  viewport (grab/grabbing cursor), so zoomed-in content can be dragged into
  view like a typical image viewer. Implemented via `startPanDrag()` +
  window-level `mousemove`/`mouseup` handlers (mirroring the pattern already
  used for crop-handle dragging), scrolling `viewportEl.scrollLeft/scrollTop`
  by the drag delta. Panning still works in crop mode when dragging outside
  the current crop selection, since the crop overlay/handles stop
  propagation for their own drag and only claim clicks inside the selection.
  `imgEl.draggable` was set to `false` to stop the native browser
  drag-ghost/text-selection from fighting the custom pan.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/ImageEditor.ts` | Added `panDrag` state and `startPanDrag()`/`handlePanDragMove()`/`handlePanDragUp()`; wired pan mousedown on `imageContainerEl` and pan move/up into the existing window-level listeners in `onMount()`; added `.image-viewport-scroll` class to the viewport element; set `imgEl.draggable = false`; cursor now shows `grab`/`grabbing` |
| `src/renderer/index.html` | Added `.image-viewport-scroll` dark-theme scrollbar rules, matching the file tree/Monaco/terminal/tab-bar pattern |

### Test Results
- 51 suites passed, 0 failed (768 tests — no test changes needed; this is DOM/CSS + interaction wiring, consistent with the existing untested-UI-interaction pattern for this component, covered instead by manual verification)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- Manual in-app verification deferred to the user per their instruction; a Playwright-based automated GUI check was attempted but stopped at their request and fully backed out (temporary `playwright-core` install removed via `npm install`, confirmed `package.json`/`package-lock.json` untouched, no leftover files)

### Commit
TBD
