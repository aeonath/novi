# Sprint 5 Plan

**target version** : 0.5.0

## Task 1

Update the ide to handle our lyric syntax extension

- syntax extension is located in ../lyric-lang-syntax/vscode/lyric-lang

- Create new module src/core/extension-loader.ts.

- read extension manifest from ~/.nova/extensions/lyric-lang/package.json.

- Load syntaxes/lyric.tmLanguage.json (or .plist) using monaco-textmate.

- Register grammar in monaco.editor and set model language to lyric.

- Log successful load in the console:

- [Nova] Lyric syntax loaded successfully.

- Write unit tests confirming:

    - Grammar load success.

    - Non-language sections are ignored.

    - Editor fallback behavior (still usable if grammar missing).


## Task 2

Allow generalized syntax support extraction from extensions

- Update loader to scan all folders under ~/.nova/extensions/*.

- For each folder:

-  Read package.json.

- If activationEvents only include onLanguage:*, allow load.

- Discard other parts of the extension other than syntax support

- Skip others, log as ignored.

- Dynamically register grammar and language metadata in Monaco.

- [Nova] Loaded N syntax extensions, M discarded.

- Extend unit tests to verify multiple extensions, bad manifest handling, and caching.

## Task 3 — Setup and File Detection

- Add directory src/core/image/ and files image-editor.ts, image-utils.ts.

- Extend file-open handler: detect image MIME types (png, jpg, jpeg, gif, webp, avif).

- Create ImageEditor.tsx under src/ui/editors/ and open it in a new tab when an image is selected.

### Acceptance Criteria:

- Image files open in the React image editor instead of text mode.

- Console logs confirm correct MIME detection.


## Task 4 - Resize and Scale

-  Implement resizeImage(path, width, height) and proportional scaling.

-  Expose via Nova command palette (Image: Resize, Image: Scale 50%).

### Acceptance Criteria:

- Resized image saves correctly.

- Aspect ratio maintained on proportional resize.

- Unit test verifies output dimensions.

## Task 5 - Crop Tool

- Add rectangular selection overlay in ImageEditor.tsx using React Canvas or <canvas> API.

- Implement cropImage(path, x, y, w, h) in service layer.

- Include preview confirmation before save.

### Acceptance Criteria:

- User can crop arbitrary region.

- Saved image matches selection precisely.

- Undo restores previous state.

## Task 6 - Transparency and Background

- Add transparency toggle in toolbar.

- Implement alpha manipulation (setTransparency(opacity)) and checkerboard preview.

### Acceptance Criteria:

- Toggle updates preview live.

- Export preserves alpha for PNG / WEBP / AVIF / GIF.

- No visible artifacts on render.

## Task 7 - Format Conversion and Export

- Implement convertFormat(path, targetFormat) supporting png, jpg, webp, gif, avif.

- Integrate “Save As…” dialog with Nova’s file-save service.

- Automatically append extension & correct MIME.

### Acceptance Criteria:

- Conversion succeeds for all supported types.

- Converted images open in external viewers.

- Directory and format remembered across sessions.

## Task 8 - Undo/Redo Stack

- Maintain in-memory history of edits.

- Implement undo() / redo() with Ctrl + Z / Ctrl + Y shortcuts.

### Acceptance Criteria:

- Sequential edits revert smoothly.

- History clears on file close.

- Stable on large image sizes.

## Task 9 - Toolbar and Context Menu

- Add React toolbar: Crop | Resize | Transparency | Save | Format.

- Toolbar should be in the tab itself and not on the external editor window areas

- Extend file-tree context menu: “Edit Image”.

### Acceptance Criteria:

- Toolbar buttons trigger correct actions.

- Context menu visible only for supported types.

## Task 10 - Unit Tests and Performance

- Make sure we have Jest tests for each operation.

- Verify UI remains responsive.

### Acceptance Criteria:

- 100 % passing tests.

- No unhandled promise rejections.

- Memory usage within limits.