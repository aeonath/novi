# Changelog: Fix Workspace Restoration and File Tree New File Bugs

**Date:** 2025-11-05  
**Time:** 18:11  
**Type:** Bug Fix  
**Component:** App, FileTree

## Summary

Fixed three critical bugs reported by user:
1. **Workspace restoration** showing empty Monaco buffer instead of file contents
2. **File tree "New File"** inline input not appearing
3. **Workspace not remembering** the opened folder in FileTree

## Bugs Fixed

### 1. Empty Monaco Buffer on Workspace Restore 🐛✅

**Problem:**
- Opening files from previous session showed tabs but Monaco editor was empty
- File content was saved in workspace but never loaded into Monaco
- User saw blank editor despite file having content

**Root Cause:**
- Workspace loading was adding tabs with `content` field
- But Monaco editor was never told to actually load the file
- Tab had content, but editor didn't receive it

**Solution:**
- Read file content from disk using `window.api.readFile()`
- Load content into Monaco using `monacoAPI.loadFile()` for first (active) file
- Properly initialize tab with fresh content from disk
- Start all restored files with `isDirty: false` (clean state)

**Code Changes:**
```typescript
// Old (buggy) - just added tab without loading content
tabBarAPI.addTab({
  content: file.content || '',  // Tab has content but Monaco doesn't
});

// New (fixed) - actually load file from disk
const content = await window.api.readFile(file.filePath);
tabBarAPI.addTab({
  content: content,
});
if (i === 0) {
  monacoAPI.loadFile(file.filePath, content);  // Load into Monaco!
}
```

### 2. File Tree "New File" Inline Input Not Showing 🐛✅

**Problem:**
- Right-clicking in file tree → "New File" did nothing
- No inline input appeared
- Feature appeared completely broken

**Root Cause:**
- Inline input logic only handled files created **inside folders**
- When creating file at **root level** (right-click empty space), input wasn't rendered
- Input rendering was inside `FileTreeNode` loop but root-level needs to be outside

**Solution:**
- Added root-level inline input rendering **before** the node loop
- Check if `newFileInput.parentPath === rootPath && !newFileInput.parentNode`
- Render `<NewFileInput>` at level 0 for root files
- Cleaned up redundant root-level handling in `FileTreeNode`

**Code Changes:**
```typescript
// In tree rendering - BEFORE node loop
{newFileInput && newFileInput.parentPath === rootPath && !newFileInput.parentNode && (
  <NewFileInput 
    level={0}
    onSubmit={handleNewFileSubmit}
    onCancel={() => setNewFileInput(null)}
  />
)}

{tree.map((node) => (
  <FileTreeNode ... />
))}
```

### 3. Workspace Not Remembering FileTree Folder 🐛✅

**Problem:**
- Workspace saved the `workspaceRoot` path
- But on restore, FileTree didn't actually load that directory
- User had to manually open folder again every session

**Root Cause:**
- `setWorkspaceRoot()` only updated state
- FileTree was never told to programmatically load that directory
- No API existed to load directory without showing file picker

**Solution:**
- Added `loadDirectoryProgrammatically()` method to FileTree
- Exposed via `__fileTreeAPI.loadDirectory()`
- Workspace restore calls this method with saved path
- FileTree loads directory and calls `onDirectoryOpen` callback

**Code Changes:**
```typescript
// FileTree.tsx - new method
const loadDirectoryProgrammatically = useCallback(async (dirPath: string) => {
  setRootPath(dirPath);
  await loadDirectory(dirPath);
  if (onDirectoryOpen) {
    onDirectoryOpen(dirPath);
  }
}, [onDirectoryOpen]);

// Expose in API
(window as any).__fileTreeAPI = {
  loadDirectory: loadDirectoryProgrammatically,
  // ...
};

// App.tsx - use it during restore
setTimeout(() => {
  const fileTreeAPI = (window as any).__fileTreeAPI;
  if (fileTreeAPI && fileTreeAPI.loadDirectory) {
    fileTreeAPI.loadDirectory(workspace.workspaceRoot);
  }
}, 100);
```

## Changes

### Modified Files

1. **src/renderer/components/App.tsx**
   - Updated workspace loading to read file content from disk via IPC
   - Added `monacoAPI.loadFile()` call for first restored file
   - Changed `isDirty` to always be `false` on restore (clean state)
   - Added FileTree directory restoration with timeout for API readiness
   - Increased timeout to 500ms for file restoration (from immediate)

2. **src/renderer/components/FileTree.tsx**
   - Created `loadDirectoryProgrammatically()` method
   - Exposed new method in `__fileTreeAPI`
   - Added root-level inline input rendering before node loop
   - Removed redundant root-level handling from `FileTreeNode`
   - Fixed inline input positioning for root-level new files

## Technical Details

### Workspace Restoration Flow (Fixed)

```
App loads workspace state
        ↓
Restore workspaceRoot → Tell FileTree to load it
        ↓
Wait 100ms for APIs to initialize
        ↓
For each file in openFiles:
  - Read content from disk (fresh copy)
  - Add tab with content
  - If first file → Load into Monaco
        ↓
Wait 500ms total for Monaco to be ready
        ↓
All files restored with content ✅
```

### New File Inline Input Flow (Fixed)

```
User right-clicks root/folder
        ↓
"New File" clicked
        ↓
Set newFileInput state with parentPath and parentNode
        ↓
If parentNode is null (root level):
  → Render input BEFORE tree nodes at level 0
If parentNode exists (folder):
  → Render input INSIDE that folder node
        ↓
Input appears at correct location ✅
```

### FileTree API Enhancement

New method added to `__fileTreeAPI`:
- `loadDirectory(dirPath: string)` - Programmatically load a directory without file picker

Existing methods:
- `openDirectory()` - Show file picker to select directory
- `refresh()` - Reload current directory

## User Experience

### Before Fixes:
- ❌ Files restored from workspace showed empty editor
- ❌ New File in tree did nothing
- ❌ Had to reopen folder every session

### After Fixes:
- ✅ Files restored with full content visible
- ✅ New File shows inline input at correct location
- ✅ FileTree automatically loads last opened folder

## Testing

- ✓ Build successful
- ✓ No linter errors
- ✓ Workspace restoration loads file content
- ✓ Monaco shows file content on restore
- ✓ FileTree loads last opened directory
- ✓ Root-level new file shows inline input
- ✓ Folder-level new file shows inline input
- ✓ All files start clean (not dirty) on restore

## Known Improvements Needed

1. **Timing dependency**: Uses `setTimeout()` for API readiness - could use Promise/async patterns
2. **Active tab handling**: Only loads first file into Monaco, other files load on demand
3. **Error handling**: Could better handle file read errors during restore

## Future Enhancements

- Use event-based API readiness instead of timeouts
- Preload content for all restored files (not just first)
- Show progress indicator during workspace restoration
- Handle file read errors gracefully with fallback UI
- Add workspace restore cancellation option

## Impact

**Severity:** High (P1) - User-facing functionality was broken  
**User Impact:** Critical workflow features now working correctly  
**Affected Areas:** Workspace persistence, file tree operations, editor loading  

These were blocking issues preventing proper session continuity and file creation workflows. All three are now resolved! 🎉

