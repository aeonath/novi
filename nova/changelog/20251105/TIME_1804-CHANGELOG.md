# Changelog: New File Functionality & Dirty Indicator Fix

**Date:** 2025-11-05  
**Time:** 18:04  
**Type:** Feature & Bug Fix  
**Component:** App, FileTree, MonacoEditor, TabBar

## Summary

Implemented comprehensive "New File" functionality with two distinct workflows (application menu and file tree), fixed the white dot dirty indicator that wasn't working, and enhanced Save As to properly handle untitled buffers.

## New Features

### 1. Application Menu "New File" ✅
- **Menu path**: File > New File (Ctrl+N)
- Creates **untitled buffer** in memory (not on disk)
- Sequential numbering: `Untitled-1`, `Untitled-2`, etc.
- Opens as a new tab with **empty Monaco editor**
- Language mode: **plaintext** by default
- Saving an untitled file automatically triggers **Save As** dialog

### 2. File Tree Context Menu "New File" ✅
- Right-click in file tree → "📄 New File"
- Shows **inline input field** directly in the tree
- Input appears at the correct folder location
- Auto-focused for immediate typing
- **Enter** creates the file and opens it in Monaco
- **Escape** or **blur** cancels the operation
- Newly created file automatically opens in editor

### 3. Untitled Buffer Management ✅
- Untitled files marked with empty `filePath: ''`
- Shows white dot (●) when modified
- Save (Ctrl+S) triggers Save As for untitled files
- Save As updates the existing untitled tab (doesn't create new tab)
- Closing modified untitled buffer shows save prompt
- Counter persists during session, increments properly

### 4. Fixed White Dot (isDirty) Indicator 🐛✅
- **Problem**: White dot wasn't appearing on modified files
- **Root cause**: `MonacoEditor` had `onDirtyChange` prop but `App.tsx` wasn't using it
- **Solution**: Wired up `onDirtyChange` callback to update TabBar dirty state
- Now works correctly: dot appears when file is modified, disappears after save

## Changes

### Modified Files

1. **src/renderer/components/App.tsx**
   - Added `untitledCounter` state to track Untitled-1, Untitled-2, etc.
   - Implemented `'new-file'` command handler in `handleMenuCommand`
   - Added `onDirtyChange` callback to `<MonacoEditor>` component
   - Updated `onSaveFileAs` to detect and update untitled tabs instead of creating new ones
   - Added `untitledCounter` to `handleMenuCommand` dependency array
   - Checks if `filePath === ''` to identify untitled buffers

2. **src/renderer/components/FileTree.tsx**
   - Added `newFileInput` state for inline file creation
   - Modified `createNewFile` to show inline input instead of `prompt()`
   - Created `handleNewFileSubmit` to create file and open it in Monaco
   - Created `NewFileInput` component for inline editing in tree
   - Updated `FileTreeNode` to render inline input at correct location
   - Passes `newFileInput` props down through tree hierarchy
   - Auto-focuses input field on appearance
   - Handles Enter (submit) and Escape (cancel) keys

3. **src/renderer/components/TabBar.tsx**
   - Updated `dirtyIndicator` style to use whitish color (`#e0e0e0`)
   - Increased font size to 14px for better visibility
   - Already had dirty indicator logic in place

## Technical Details

### Untitled Buffer Flow

```
User clicks "File > New File"
        ↓
Create tab with filePath: ''
fileName: `Untitled-${counter}`
        ↓
Open empty Monaco editor
        ↓
User types content → White dot appears
        ↓
User presses Ctrl+S
        ↓
Detect filePath === '' → Trigger Save As
        ↓
Show file picker dialog
        ↓
Save file and update tab with real path
```

### File Tree Inline Input Flow

```
User right-clicks folder → "New File"
        ↓
Show inline input in tree at folder location
        ↓
Auto-focus input field
        ↓
User types filename → Press Enter
        ↓
Create file on disk at folder path
        ↓
Reload directory in tree
        ↓
Open new file in Monaco editor
```

### Dirty State Detection

The dirty indicator now works because of this connection:

```
MonacoEditor detects content change
        ↓
Calls onDirtyChange(true)
        ↓
App.tsx updates TabBar.updateTabDirty(tabId, true)
        ↓
TabBar re-renders with white dot (●)
```

### Save As for Untitled Files

```typescript
// In onSaveFileAs
const currentTab = tabBarAPI.getActiveTab();
const isUntitled = currentTab && currentTab.filePath === '';

if (isUntitled) {
  // Update existing tab instead of creating new one
  tabBarAPI.removeTab(currentTab.id);
  tabBarAPI.addTab({
    id: currentTab.id,  // Keep same ID
    filePath: result.path,  // Update with real path
    fileName: fileName,  // Update with real name
    isDirty: false,
    // ...
  });
}
```

## User Experience

### Application Menu "New File"
1. **File > New File** or **Ctrl+N**
2. New tab opens: `[Untitled-1]`
3. Start typing immediately
4. White dot appears: `[Untitled-1 ●]`
5. **Ctrl+S** opens Save As dialog
6. Choose location and name
7. Tab updates: `[myfile.ts]` (no dot)

### File Tree "New File"
1. Right-click folder in tree
2. Click **"📄 New File"**
3. Inline input appears in tree (blue border, focused)
4. Type filename: `newfile.ts`
5. Press **Enter**
6. File created on disk and opened in Monaco

### White Dot Behavior
- ✅ Appears when file is modified
- ✅ Works for both regular files and untitled buffers
- ✅ Disappears after save
- ✅ Reappears if file is modified again after save
- ✅ Triggers save prompt when closing tab

## Components Created

### NewFileInput Component

```typescript
<NewFileInput 
  level={indentation level}
  onSubmit={(fileName) => createFile(fileName)}
  onCancel={() => hideInput()}
/>
```

Features:
- Auto-focused input field
- Blue border for visibility
- File icon (📄) prefix
- Placeholder: "filename.txt"
- Enter to submit
- Escape to cancel
- Blur with content submits, blur without content cancels

## Testing

- ✓ Build successful
- ✓ No linter errors
- ✓ Untitled-1, Untitled-2 numbering works
- ✓ Empty Monaco buffer opens
- ✓ White dot appears on modification
- ✓ Save triggers Save As for untitled
- ✓ Save As updates tab (doesn't create new)
- ✓ File tree inline input appears
- ✓ Enter creates file and opens it
- ✓ Escape cancels inline input
- ✓ Newly created file opens in Monaco
- ✓ Closing modified untitled shows save prompt

## Known Limitations

1. **Inline input positioning**: Simple implementation - shows at folder level, not perfectly inline with children
2. **Root level new file**: If right-clicking outside folders, needs special handling (already alerts user)
3. **Untitled counter**: Resets to 1 on application restart (session-only)
4. **Language detection**: Untitled files default to plaintext until saved with extension

## Future Enhancements

- Remember untitled counter across sessions
- Auto-detect language from typed content (e.g., `function` → JavaScript)
- Better inline input positioning with smooth animation
- Allow creating multiple files in sequence
- Auto-suggest file extensions based on context
- Template support for new files

## User Acceptance

All requirements from user met:
✅ Application menu creates untitled buffer (Untitled-1, Untitled-2, etc.)  
✅ Untitled buffers open in empty Monaco editor  
✅ Save triggers Save As for untitled files  
✅ File tree shows inline prompt for filename  
✅ New file created in correct folder location  
✅ New file automatically opens in Monaco  
✅ White dot appears for modified files (fixed!)  
✅ White dot disappears after save  
✅ Closing modified files shows save prompt  

Excellent foundation for file management! 🎉

