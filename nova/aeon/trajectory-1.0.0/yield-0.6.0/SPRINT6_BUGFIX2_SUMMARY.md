# Sprint 6 - Bug Fix #2: Model Not Found Crash & Monaco-Vim In-Repo Port

**Agent**: Auto  
**Date**: February 2026  
**Status**: ✅ Resolved

---

## Issue Summary

With the `monaco-vim` plugin enabled, the app threw critical **"Model not found"** errors. These appeared as:

- `[Novi] Unhandled rejection: Error: Model not found`
- `Uncaught (in promise) Error: Model not found`

at `WW.createModelReference` and `ju._onPositionChanged` inside Monaco’s editor API, triggered from the monaco-vim adapter (`cm_adapter.ts`) during cursor position handling.

Additionally, the fix for this crash lived in the **monaco-vim** npm package source, but the package could not be rebuilt in our environment (e.g. Windows/bash build failures), so the fix could not be shipped while still depending on the published package.

---

## Root Cause

In **monaco-vim**’s `cm_adapter.ts`, the `handleCursorChange` handler called `editor.getModel().getLineMaxColumn(...)` without checking for a null model. During tab switches or when the editor’s model was temporarily unset or disposed, `getModel()` could return `null`, which led to the "Model not found" path inside Monaco and the unhandled rejection.

---

## Solution Implemented

### 1. Code fix (in monaco-vim adapter)

In `handleCursorChange`:

- Obtain the model once: `const model = editor.getModel()`.
- If `model` is null, **return immediately** (no dispatch, no further access to the model).
- Otherwise use `model.getLineMaxColumn(...)` (and the rest of the logic) as before.

This prevents the crash when the editor has no active model (e.g. during tab switches or disposal).

### 2. Adding the plugin directly to the codebase

Instead of continuing to depend on the **monaco-vim** npm package, we **ported the plugin into the Novi repo** and removed the external dependency.

**Location**: `src/renderer/vim/`

**Contents** (vendored from monaco-vim, originally v0.4.4):

- `index.ts` – exports `initVimMode`, `VimMode`, `StatusBar`
- `statusbar.ts` – vim status bar UI
- `cm_adapter.ts` – Monaco ↔ CodeMirror vim adapter (with the null-check fix above)
- `cm/keymap_vim.ts` – CodeMirror vim keymap
- `README.md` – origin, license, and notes on local changes and upstream updates

**Rationale for in-repo plugin**:

1. **Unreliable rebuild of the npm package** – Building monaco-vim (e.g. `pnpm run build` in `node_modules/monaco-vim`) failed in our environment, so we could not ship the "Model not found" fix while depending on the published package.
2. **monaco-vim is critical** – Vim keybindings are required for the project; we need a maintainable, buildable solution.
3. **Full control over patches** – By owning the source under `src/renderer/vim/`, we can fix bugs (like the model null-check), adjust behavior, and avoid waiting on upstream releases or fighting package build issues.
4. **Single build pipeline** – The vim code is built as part of the renderer bundle (esbuild); no separate plugin build step is required.
5. **Clear provenance** – `src/renderer/vim/README.md` documents origin (monaco-vim, MIT), license, and how to re-apply our fix when syncing from upstream.

### 3. Integration and dependency cleanup

- **MonacoEditor.tsx** – Replaced dynamic imports from `'monaco-vim'` with the in-repo module: `await import('../vim/index.js')`.
- **package.json** – Removed the `monaco-vim` dependency so the app no longer relies on the npm package.

---

## Verification

- `npm run build` (including renderer build) completes successfully.
- Vim mode continues to work; the "Model not found" crash no longer occurs when switching tabs or when the model is temporarily absent.
- No dependency on the monaco-vim npm package; all vim behavior is supplied from `src/renderer/vim/`.

---

## Related Files

- `src/renderer/vim/` – in-repo monaco-vim implementation and README
- `src/renderer/components/MonacoEditor.tsx` – import path change to `../vim/index.js`
- `package.json` – removal of `monaco-vim` dependency

---

## Credits

**Investigation & fix (Model not found)**: Claude (Sonnet 4.5)  
**In-repo port & summary**: Auto
