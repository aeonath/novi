# Bugfix Summary: FileTree Path Separator Issue

**Date**: 2025-11-21 08:31  
**Status**: ✅ Completed  
**Severity**: High  
**Platform**: Windows

## Issue
FileTree operations (delete, rename, create) did not refresh the tree view on Windows, leaving stale entries visible after file system changes.

## Root Cause
Hardcoded forward slash (`/`) path separators in parent directory extraction logic failed on Windows paths using backslashes (`\`).

## Solution
Updated FileTree path handling in four functions:
- `deleteNode`
- `renameNode` 
- `createNewFolder`
- `handleNewFileSubmit`

All now detect and use appropriate path separator (forward or backslash) based on platform.

## Files Modified
- `src/renderer/components/FileTree.tsx`

## Tests
- Unit tests: `src/tests/core-0.5.0/file-tree-path-separator.test.ts`
- All tests passing ✅

## Changelog
See: `nova/changelog/20251121/TIME_0831-CHANGELOG.md`

## Commit
`d75e957` - Fix FileTree not refreshing after delete/rename/create operations on Windows

