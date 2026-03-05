# Changelog — 2026-03-05 01:41

## Sprint 7 Task 3: Update single file tree behavior

### Summary
Updated file tree behavior based on singlefiletree setting: open folder button only shows when singlefiletree is ON, Novi Shell shows gray placeholder instead of file tree, `..' entry removed from all views, and empty directories show a message.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/FileTree.tsx` | Added `showOpenFolder` prop to control open folder button visibility; removed `..` parent directory entry entirely; split empty state into "no folder open" vs "directory is empty" messages; hide Open Folder button in empty state when `showOpenFolder` is false |
| `src/renderer/components/App.tsx` | Pass `showOpenFolder={singleFileTree}` to FileTree; show gray placeholder sidebar when Novi Shell tab is active; hide FileTree when Novi Shell is active |

### Rationale
- **Open folder button**: Only relevant when singlefiletree is ON (constant directory mode). When OFF, the file tree follows terminal CWD automatically.
- **Novi Shell**: Should never show the file tree; gray area reserved for future use.
- **`..` removal**: No longer supporting parent directory navigation via `..` entry.
- **Empty directory message**: Users need feedback when a directory has no files.
- **File tab inheritance**: Already working from Task 2 — file tabs opened from a terminal's file tree inherit that tree view.

### Test Results
- **605 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
