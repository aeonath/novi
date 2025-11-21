# Bugfix: Save Dialog and FileTree Refresh Issues — 20251121.0844

## Summary
Fixed two issues related to saving new files:
1. Save prompt dialog appearing unnecessarily after saving a new (untitled) file for the first time
2. Newly saved files not appearing in the FileTree until manual refresh

## Problem Description

### Issue 1: Unwanted Save Prompt
When creating a new file (Ctrl+N), typing content, and saving it for the first time (Ctrl+Shift+S):
- File saved successfully
- Tab updated with new filename
- But when closing the tab, the "Do you want to save changes?" dialog appeared even though the file was just saved
- This created confusion and extra clicks for users

**Root Cause**: After saving an untitled file via "Save As", the tab's `isDirty` flag was not being explicitly updated to `false`, leaving the tab marked as having unsaved changes.

### Issue 2: File Not Visible in FileTree
After saving a new file:
- File written to disk successfully
- Tab showed the new filename
- But FileTree on the left didn't update to show the new file
- Required manual folder refresh or reopening the folder

**Root Cause**: The FileTree component was not being notified to refresh after a "Save As" operation completed.

## Files Changed

### Modified
- **src/renderer/components/App.tsx**
  - Line 739: Added explicit `updateTabDirty(currentTab.id, false)` call after updating untitled tab with saved file path
  - Line 753: Added explicit `updateTabDirty(newTabId, false)` call after creating new tab for "Save As" operation
  - Lines 758-764: Added FileTree refresh logic after successful save - calls `fileTreeAPI.refresh()` to reload directory contents

## Technical Details

### Fix 1: Explicitly Clear Dirty Flag After Save
```typescript
// After updating tab with new file path
tabBarAPI.updateTabDirty(currentTab.id, false);

// OR for new tab creation
tabBarAPI.updateTabDirty(newTabId, false);
```

Previously, the code only called `monacoAPI.markAsSaved()` which updated Monaco's internal state, but the TabBar component's `isDirty` flag wasn't being synchronized. This caused a mismatch where Monaco knew the file was saved but the tab still appeared dirty.

### Fix 2: Refresh FileTree After Save
```typescript
// Refresh FileTree to show the newly saved file
const fileTreeAPI = (window as any).__fileTreeAPI;
if (fileTreeAPI && fileTreeAPI.refresh) {
  console.log('[App] Refreshing FileTree after save');
  fileTreeAPI.refresh();
}
```

This calls the FileTree's existing `refresh()` method which reloads the current directory, making newly saved files immediately visible.

## Testing
- Manual testing confirmed:
  - ✅ New file saved via Ctrl+Shift+S shows correct filename in tab
  - ✅ No save prompt appears when closing tab after saving new file
  - ✅ Newly saved file appears immediately in FileTree
  - ✅ Existing "Save As" behavior (creating duplicate) still works correctly
- All 574 unit tests passing ✅

## User-Facing Impact
**MEDIUM-HIGH IMPACT FIX**
- Smoother workflow when creating and saving new files
- No more confusing save prompts after file is already saved
- Immediate visual feedback in FileTree when new files are created
- Eliminates need to manually refresh folder to see new files

## Build Process
```bash
npm run build  # Successful compilation
npm test       # All 574 tests passing
```

## Git Commit Hash
`TBD` - Bugfix: Fix save dialog and FileTree refresh for new files

## Status
✅ Completed

## Related Issues
- User reported: "We don't need to display the do you want to save the changes dialog box when we save a new file for the first time"
- User reported: "our new file isn't appearing in the file tree on the left after we create it"
- Affects: All users creating new files
- Severity: Medium-High (workflow friction)

## Future Considerations
- Consider watching file system events to automatically update FileTree without explicit refresh calls
- Could add visual feedback (flash/highlight) when new file appears in FileTree
- May want to expand the parent folder automatically if collapsed when new file is saved

