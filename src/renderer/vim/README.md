# Vim keybindings for Monaco Editor

This directory contains a **vendored** copy of [monaco-vim](https://github.com/brijeshb42/monaco-vim) (originally v0.4.4). It is maintained in-repo so we can patch and build without depending on the upstream npm package.

## Origin

- **Source:** https://github.com/brijeshb42/monaco-vim  
- **License:** MIT (see repository)  
- **CodeMirror vim bindings:** MIT (see LICENSE.codemirror.txt in upstream repo)

## Local changes

- **Model not found crash:** In `cm_adapter.ts`, `handleCursorChange` now checks `editor.getModel()` for null and returns early when the model is missing (e.g. during tab switches or disposal). This prevents "Model not found" errors from the Monaco API.

## Updating from upstream

To refresh from the upstream monaco-vim package:

1. Copy `node_modules/monaco-vim/src/*` into `src/renderer/vim/` (preserve `cm/` for `keymap_vim.ts`).
2. Re-apply the null-check in `cm_adapter.ts` in `handleCursorChange` if upstream does not include it.
3. Do not copy `demo.ts` (not used by the app).
