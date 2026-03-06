# Changelog — 2026-03-05 22:39

## Dedicated editor file watcher for external change detection

### Summary
Replaced the broken approach of piggybacking on the file tree watcher with a dedicated `EditorFileWatcher` service that independently monitors files open in the editor using Node's `fs.watch()`. When a file is modified externally (e.g., by another editor, git, CLI tools), Novi now switches to the file's tab and either auto-reloads (if the user has no unsaved changes) or shows a notification banner with "Reload" and "Ignore" buttons (if the user has unsaved edits).

### Root Cause
The previous implementation tried to detect external file changes through the file tree watcher (`FileTreeWatcher`), which only watches root + expanded directories at depth 1. This meant files in collapsed/unwatched directories were never detected. Additionally, the file tree watcher is a structural component and shouldn't be responsible for editor concerns.

### Implementation

#### `src/main/services/editor-file-watcher.ts` (NEW)
- Uses `fs.watch()` to monitor individual file paths
- `watchFile(path)` / `unwatchFile(path)` — start/stop watching specific files
- `markSaved(path)` — suppresses the next fs event for 2 seconds to avoid triggering on our own saves
- Emits `file-changed` event when external modification detected
- Completely independent of `FileTreeWatcher`

#### `src/main/main.ts`
- Added import for `editorFileWatcher`
- Added IPC handlers: `editor-watch-file`, `editor-unwatch-file`
- Forwards `file-changed` events to renderer via `editor-file-changed` IPC channel
- Calls `editorFileWatcher.markSaved()` in the `save-file` handler to prevent false positives

#### `src/preload/preload.ts`
- Added `editorWatchFile`, `editorUnwatchFile`, `editorOnFileChanged`, `editorRemoveFileChangedListener`

#### `src/types/global.d.ts`
- Added type declarations for the new editor file watcher API methods

#### `src/renderer/components/App.ts`
- Replaced `fileTreeOnChange` listener with `editorOnFileChanged` listener
- Watches files via `editorWatchFile` when switching to a file tab (`onTabSwitch`)
- Unwatches files via `editorUnwatchFile` when closing a file tab (`onTabClose`)
- Updated `handleExternalFileChange()`:
  - Switches to the changed file's tab before showing the prompt
  - If file is not dirty: auto-reloads silently from disk
  - If file is dirty: shows banner with "Reload" / "Ignore" buttons

#### `src/main/services/file-tree-watcher.ts`
- Reverted `change` event handler — no longer forwards content changes (structural watcher only)

### Files Changed
- **`src/main/services/editor-file-watcher.ts`** — NEW: Dedicated file watcher for editor
- **`src/main/main.ts`** — IPC handlers + markSaved integration
- **`src/preload/preload.ts`** — New API methods
- **`src/types/global.d.ts`** — Type declarations
- **`src/renderer/components/App.ts`** — Use dedicated watcher, auto-reload, tab switching
- **`src/main/services/file-tree-watcher.ts`** — Reverted change event forwarding

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
