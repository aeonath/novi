# Sprint 6 Task 2 — Research: Vim Plugin for VS Code / Vi Mode in Monaco Editor

## Task objective
Download and research the source for the vim plugin for VS Code; assess how difficult it would be to implement vi mode in Novi’s Monaco editor; consider that vi mode would be toggled on/off via a setting in the Novi Shell (future central settings surface). Document findings and an implementation proposal. No codebase changes in this task.

---

## 1. Sources reviewed

### 1.1 VS Code Vim extension (VSCodeVim)
- **Repository**: https://github.com/VSCodeVim/Vim  
- **License**: MIT  
- **Scale**: ~15k stars, 1.4k forks, 8.4M+ Marketplace installs  
- **Stack**: TypeScript, webpack; uses VS Code extension API only.

**Architecture (relevant to “portability” to Monaco):**
- **Host coupling**: The extension is built entirely on the VS Code API. Entry point `extension.ts` uses `vscode.workspace`, `vscode.window`, `context: vscode.ExtensionContext`, and registers commands/listeners via VS Code. All key handling, mode state, and text edits go through VS Code’s `TextEditor`, commands, keybindings, and “when” clause contexts (e.g. `vim.mode == 'Normal'`).
- **Core behavior**: A “ModeHandler” (and related modules) turns key events into string names and runs vim-style logic (normal/insert/visual/operator-pending/command-line, etc.). Configuration (remaps, settings) is validated and applied per mode. There is no standalone “vim engine” that talks to a generic editor API; it is a VS Code–specific vim emulator.
- **Features**: Full vim modes, key remapping (per-mode), .vimrc (remaps only), emulated plugins (easymotion, surround, commentary, sneak, etc.), optional Neovim integration for ex commands, multi-cursor, status bar coloring.

**Conclusion**: The VS Code Vim extension **cannot be dropped into Novi** as-is. It would require either (a) reimplementing its behavior on top of Monaco’s `IStandaloneCodeEditor` and our own key/command layer, or (b) using a different solution that already targets Monaco.

### 1.2 monaco-vim
- **Repository**: https://github.com/brijeshb42/monaco-vim  
- **npm**: `monaco-vim`  
- **License**: MIT (plus CodeMirror vim license for the underlying implementation)  
- **Scale**: ~348 stars, 32 forks  

**Architecture:**
- **Purpose**: Adds vim keybindings to **Monaco Editor** by adapting CodeMirror’s vim implementation to Monaco. It sits between CodeMirror’s vim layer and Monaco’s API.
- **API**:
  - `initVimMode(editor, statusBarNode)` — enables vim on an existing Monaco editor instance and shows mode/status in the given DOM node.
  - `vimMode.dispose()` — removes vim bindings and cleans up.
- **Integration style**: Works with the same Monaco instance Novi already creates (`monaco.editor.create(...)`). Supports AMD (e.g. Monaco loader) and ESM. Custom ex commands can be added via `VimMode.Vim.defineEx()`.
- **Known limitations** (from project README): Some keybindings that expect extra input (ex commands, search/replace) may have issues; the layer is CodeMirror-vim → Monaco, so not every VS Code Vim feature is present.

**Conclusion**: **monaco-vim is the only reviewed option that directly targets Monaco** and supports a clean “turn on / turn off” pattern (init vs dispose), which aligns with a Novi Shell toggle.

---

## 2. Difficulty assessment

| Approach | Difficulty | Notes |
|----------|------------|--------|
| **Integrate monaco-vim + Novi Shell setting** | **Moderate** | Add dependency; after Monaco is created, call `initVimMode(editor, statusBarNode)` or `vimMode.dispose()` based on a persisted setting. Handle status bar placement (e.g. in Novi status bar or a small div). Test with Novi’s existing key handlers (e.g. Ctrl+S) so they are not swallowed; use `preventDefault()` before init for keys that must stay with Novi. |
| **Port or reimplement VSCodeVim for Monaco** | **High** | Would require reimplementing mode handling, key parsing, remaps, and text operations on top of `IStandaloneCodeEditor` and our own event layer. Large effort and long-term maintenance. Not recommended as a first step. |

Recommendation: **Implement vi mode by integrating monaco-vim and a Novi Shell setting.** Use VSCodeVim only as reference for expected behavior and UX (e.g. status bar, modes); do not attempt to reuse its code in Novi.

---

## 3. Implementation proposal (vi mode via monaco-vim + Novi Shell)

### 3.1 Assumptions
- “Novi Shell” will be the place where all editor and app settings live and will become the main control surface (replacing or complementing menus).
- Vi mode is a **per-editor setting** that can be toggled on or off and persisted (e.g. `editor.vimMode` or `vim.enabled`).
- The same Monaco instance may stay open when the user toggles the setting; we need to init or dispose vim without recreating the whole editor.

### 3.2 High-level steps (for a future implementation task)

1. **Dependency**
   - Add `monaco-vim` to the project (ensure compatibility with current `monaco-editor` version; Novi uses monaco-editor in the renderer, so use the same bundling/loader approach as for Monaco).

2. **Setting**
   - Define a persisted setting, e.g. `editor.vimMode` (boolean), in the same store used by Novi Shell (e.g. existing `getSetting` / `setSetting` IPC or equivalent).
   - Default: `false` (vi mode off).

3. **Monaco editor lifecycle**
   - When the Monaco editor is created (e.g. in `MonacoEditor.tsx` or the component that holds `monaco.editor.create`):
     - After the editor instance is ready, read `editor.vimMode`.
     - If `true`, call `initVimMode(editor, statusBarNode)` and keep a ref to the returned handle for disposal.
     - If `false`, do nothing.
   - When the user toggles “Vi mode” in Novi Shell:
     - If turning **on**: call `initVimMode(editor, statusBarNode)` and persist `editor.vimMode = true`.
     - If turning **off**: call `vimMode.dispose()` and persist `editor.vimMode = false`.
   - When the editor is disposed (e.g. tab closed), call `vimMode.dispose()` if vim was active.

4. **Status bar**
   - monaco-vim expects a DOM node to show current mode (e.g. “NORMAL”, “INSERT”). Options:
     - **A**: Reserve a small area in Novi’s existing status bar (e.g. right side) and pass that element as `statusBarNode`.
     - **B**: Render a minimal div near the editor (e.g. bottom-right of the editor container) and pass that.  
   - Prefer A if Novi Shell / status bar is the single place for mode and other editor state.

5. **Key handling**
   - If Novi needs to keep certain shortcuts (e.g. Ctrl+S, Ctrl+Shift+P) while vim is on, register `onKeyDown` **before** calling `initVimMode` and call `preventDefault()` for those keys so monaco-vim does not consume them (as in monaco-vim README).

6. **Optional enhancements (later)**
   - Custom ex commands via `VimMode.Vim.defineEx()` (e.g. `:w` to save, `:q` to close) that call Novi’s existing actions.
   - Sync setting across windows or tabs if Novi supports multiple editor contexts.

### 3.3 Risks and limitations
- **Compatibility**: Verify monaco-vim with the exact monaco-editor version in use (e.g. 0.54.x); test after upgrading Monaco.
- **Bundling**: Novi loads Monaco via a custom path (e.g. `monaco-loader.js`); ensure monaco-vim is loaded in a way that can access the same Monaco instance (e.g. same AMD/ESM context).
- **Feature gap**: monaco-vim will not match VSCodeVim feature-for-feature (e.g. easymotion, surround); document which subset is supported and consider adding custom ex commands for Novi-specific actions.
- **UX**: Clear indication in Novi Shell that “Vi mode” is on/off and that it affects the Monaco editor only (not terminal or other panes).

### 3.4 No code changes in this task
Per task instructions, **no modifications were made to the Novi codebase**. This document is research and a proposal only. A follow-up task (e.g. Sprint 6 Task 3 or a dedicated “Implement vi mode” task) would implement the above.

---

## 4. References

- VSCodeVim: https://github.com/VSCodeVim/Vim (source reviewed; extension.ts, README, architecture inferred from docs and entry point).
- monaco-vim: https://github.com/brijeshb42/monaco-vim (README, usage, API).
- npm: `monaco-vim` (install and usage).
- Monaco Editor: no built-in vim support; [microsoft/monaco-editor#182](https://github.com/microsoft/monaco-editor/issues/182) closed as “not planned,” so third-party integration (e.g. monaco-vim) is the intended approach.

---

## 5. Status

✅ Research and implementation proposal complete. No code changes. Ready for a future implementation task when Novi Shell and the setting store are in place.
