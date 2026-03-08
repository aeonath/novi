# Changelog — 20260308.1110

## Ad hoc: Make sidebar resize divider invisible — cursor only

### Problem
The 4px sidebar resize divider created a visible gap between the file tree and the tab area. On hover it highlighted with a background color, taking up space.

### Fix
- Made divider `width: 0` with `padding: 0 2px` and `margin: 0 -2px` so it overlaps the boundary without taking layout space. Set `position: relative; z-index: 1` to keep it clickable on top.
- Removed hover/resize background color changes — now only the `col-resize` cursor indicates the drag zone.

### Files Changed
- `src/renderer/components/App.ts` — divider element styling and `startResize()` method

### Test Results
- 37 suites passed, 642 tests passed
- 2 pre-existing environment-specific failures (extension-loader, installer) unrelated to this change

### Commit Hash
TBD
