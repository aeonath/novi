# Bugfix Summary: FileTree New File Folder Expansion

**Date**: 2025-11-21 09:21  
**Status**: ✅ Completed  
**Severity**: High  
**Platform**: All

## Issue
"New File" context menu not showing input field when right-clicking on collapsed folders.

## Root Cause
Folder expansion logic only expanded if folder wasn't already in `expandedDirs` set. Also, `expandedDirs` in dependency array caused stale closures.

## Solution
- Always expand parent directory when creating new file
- Removed conditional check `!expandedDirs.has(parentPath)`
- Removed `expandedDirs` from useCallback dependencies
- Added explicit `parentNode.isDirectory` check

## Files Modified
- `src/renderer/components/FileTree.tsx`

## Tests
- All 574 tests passing ✅
- Build successful ✅

## Changelog
See: `nova/changelog/20251121/TIME_0921-CHANGELOG.md`

## Commit
`TBD` - Bugfix: Fix FileTree New File folder expansion logic

