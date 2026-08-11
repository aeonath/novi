# Changelog — 2026-08-10 19:55

## Ad hoc: Implement :q / :q! / :wq for the VI Mode editor

### Summary
User requested Vim quit-family ex commands for the editor's VI Mode:
`:wq` writes and closes the tab, `:q!` closes without saving, and `:q`
closes only if there are no unsaved changes (otherwise refuses, matching
real vim). `:wq!` was noted as not meaningfully different from `:wq` here
(no read-only-file concept to force past).

`monaco-vim` (the vendored VI Mode library) ships no quit-family ex commands
at all — only a handful of built-ins (`w`, `undo`, `redo`, `set`, `sort`,
`substitute`, etc., see its `defaultExCommandMap`). Novi had previously only
registered `:w` itself via `Vim.defineEx`; typing `:q` or `:wq` did nothing
(monaco-vim reports "Not an editor command").

### Implementation
Added `Vim.defineEx('quit', 'q', ...)` and `Vim.defineEx('wq', 'wq', ...)` in
`MonacoEditor.ts`'s `initVim()`, alongside the existing `:w`. monaco-vim's ex
parser matches a command name via `\w+` only — a trailing `!` isn't part of
the name, it lands in `params.argString` — so `:q!` is detected as
`params.argString.trim() === '!'` on the same `quit` handler, no separate
registration needed.

Extracted the actual save/close logic out of the `Vim.defineEx` closures
into two plain exported functions — `saveActiveVimFile()` and
`closeActiveVimFile()` — taking mock-able `tabBar`/`monacoEditor`/`saveFile`
dependencies instead of reading `window.*` directly, so they're unit
testable without mounting a real Monaco editor or dynamically importing
`monaco-vim` (same "exported for direct unit testing" pattern already used
by `Terminal.ts`'s `isClaimedByAppShortcut`/`shouldXtermHandleKey`). This
also gave the pre-existing `:w` logic test coverage for the first time.

- **`:q`**: refuses (shows real vim's `E37: No write since last change (add
  ! to override)` in the vim status bar via `cm.openNotification`) if the
  active file tab is dirty; otherwise closes it immediately.
- **`:q!`**: discards changes and closes unconditionally. Implemented by
  marking the tab clean (`updateTabDirty(id, false)`) *before* calling
  `TabBar.removeTab()` — `removeTab()` normally awaits an `onTabClose` check
  in `App.ts` that pops the interactive Save/Discard/Cancel dialog for dirty
  tabs (the right UX for the `[x]`/Ctrl+W path, wrong for `:q!`, which should
  never prompt); marking it clean first makes that check see nothing to
  confirm, exactly mirroring what the Save Prompt's own Discard button
  already does.
- **`:wq`**: saves via the same path as `:w`, and only closes if the save
  actually succeeded (`result === 'saved'`) — a failed save (e.g. IO error)
  now leaves the buffer open with vim's `E212: Can't open file for writing`,
  instead of quitting anyway. An untitled tab (`'no-path'`) is left as a
  silent no-op, matching `:w`'s existing behavior for that case rather than
  showing a misleading write-failure message.
- **`:wq!`**: parses fine (bang lands in `argString`, unused) and behaves
  identically to `:wq` — no distinct forcing semantics, as discussed.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/MonacoEditor.ts` | Extracted `saveActiveVimFile()`/`closeActiveVimFile()` (+ `VimTabBarLike`/`VimMonacoEditorLike` types) as exported module-level functions; `initVim()`'s `:w` handler now calls `saveActiveVimFile()`; added `Vim.defineEx` registrations for `:q`/`:quit` and `:wq` |
| `src/tests/core-0.8.0/monaco-editor-vim-ex-commands.test.ts` | New file — 11 tests covering `saveActiveVimFile()` (saved/no-path/failed/no-saveFile/non-file-tab cases) and `closeActiveVimFile()` (no active tab, non-file tab, refuse-when-dirty, close-when-clean, force-discard) |

### Test Results
- 58 suites passed, 0 failed (894 tests, up from 883 — 11 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
