# Bugfix Summary: FileTree New File on Files vs Folders

**Date**: 2025-11-21 09:31  
**Status**: ✅ Completed  
**Severity**: Critical  
**Platform**: All

## Issue
"New File" not working when right-clicking on files - no input appeared, no file created.

## Root Cause
Code assumed `parentNode` was always a directory or null, but users right-click on files too. Using file's path as parent directory caused invalid paths.

## Solution
Added three-way logic to handle:
1. Null → use root path
2. Directory → use folder's path  
3. File → extract parent directory from file's path

## Files Modified
- `src/renderer/components/FileTree.tsx`

## Tests
- All 574 tests passing ✅
- Should test manually with actual file right-clicks

## Changelog
See: `nova/changelog/20251121/TIME_0931-CHANGELOG.md`

## Commit
`TBD` - Bugfix: Fix FileTree New File to handle files vs folders

