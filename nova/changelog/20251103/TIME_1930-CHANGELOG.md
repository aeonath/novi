# CHANGELOG - Fix Monaco Editor Module Loading

**Date:** November 4, 2025  
**Issue:** Monaco Editor failed to load with "Failed to resolve module specifier" error  
**Fix:** Switch from ES module import to AMD loader

## Problem
The browser couldn't resolve the bare module specifier `'monaco-editor'` when loaded as an ES module. Error:
```
Uncaught TypeError: Failed to resolve module specifier "monaco-editor". 
Relative references must start with either "/", "./", or "../".
```

## Root Cause
Monaco Editor requires either:
1. A bundler (Webpack/Vite) to resolve npm package imports, or
2. The AMD loader for direct browser loading

We were trying to use a bare ES module import without a bundler, which doesn't work in the browser.

## Solution
Switched to Monaco's AMD loader, the recommended approach for non-bundled environments.

### Changes Made

**1. Updated `src/renderer/index.html`**
- Added AMD loader scripts before our app loads:
  - `vs/loader.js` - Monaco's AMD loader
  - `vs/editor/editor.main.nls.js` - Language support
  - `vs/editor/editor.main.js` - Main Monaco editor
- Configured `require.paths` to point to `./vs`

**2. Updated `src/renderer/editor/monaco-editor.ts`**
- Removed ES module import: ~~`import * as monaco from 'monaco-editor'`~~
- Added global declaration: `declare const monaco: typeof import('monaco-editor')`
- Changed editor type from `monaco.editor.IStandaloneCodeEditor` to `any` to avoid TypeScript namespace issues

**3. Updated `src/renderer/index.ts`**
- Added `waitForMonaco()` function to ensure Monaco loads before app initialization
- App now waits for `monaco` global to be available before creating editor

**4. Updated `src/types/global.d.ts`**
- Added Monaco global declaration in `declare global` block
- Added TypeScript reference: `/// <reference types="monaco-editor" />`

## Technical Details

### AMD Loader Flow
```
1. Browser loads index.html
2. AMD loader (vs/loader.js) initializes
3. Monaco editor files load via AMD
4. monaco global becomes available
5. Our app waits for monaco global
6. App initializes and creates editor
```

### Load Sequence
```html
<script>var require = { paths: { vs: './vs' } };</script>
<script src="./vs/loader.js"></script>
<script src="./vs/editor/editor.main.nls.js"></script>
<script src="./vs/editor/editor.main.js"></script>
<script type="module" src="./index.js"></script>
```

## Testing
- ✅ Build succeeds without errors
- ✅ App starts successfully
- ✅ Monaco editor loads and displays
- ✅ No console errors
- ✅ TypeScript compiles without errors

## Files Modified
- `src/renderer/index.html` - Added AMD loader scripts
- `src/renderer/editor/monaco-editor.ts` - Switched to AMD global
- `src/renderer/index.ts` - Added Monaco wait logic
- `src/types/global.d.ts` - Added Monaco global declaration

## References
- [Monaco Editor Documentation - Integrating the ESM version](https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md)
- [Monaco Editor - AMD Loader Usage](https://microsoft.github.io/monaco-editor/docs.html)

