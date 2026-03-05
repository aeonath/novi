# Bugfix Summary: Save Dialog and FileTree Refresh

**Date**: 2025-11-21 08:44  
**Status**: ✅ Completed  
**Severity**: Medium-High  
**Platform**: All

## Issues
1. Unwanted save prompt appearing after saving new file for first time
2. Newly saved files not appearing in FileTree without manual refresh

## Root Causes
1. Tab `isDirty` flag not explicitly cleared after "Save As" operation
2. FileTree not notified to refresh after file save

## Solution
- Added explicit `updateTabDirty(false)` calls after saving untitled files
- Added `fileTreeAPI.refresh()` call after successful "Save As" operation

## Files Modified
- `src/renderer/components/App.tsx`

## Tests
- All 574 tests passing ✅
- Manual testing confirms both issues resolved

## Changelog
See: `nova/changelog/20251121/TIME_0844-CHANGELOG.md`

## Commit
`TBD` - Bugfix: Fix save dialog and FileTree refresh for new files

