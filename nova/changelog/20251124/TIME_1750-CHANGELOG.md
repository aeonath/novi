# Bug Fixes — 20251124.1750

## Summary
Fixed two critical bugs in Nova 0.5.0:
1. UTF-8 character encoding issues in packaged exe (garbled apostrophes, hyphens in vim)
2. File tree not updating when files are deleted via terminal

## Files Changed

### UTF-8 Encoding Fix
- **src/main/services/terminal-service.ts** — Changed locale from `en_US.UTF-8` to `C.UTF-8` for better Windows Git Bash compatibility in packaged apps. Added `LC_CTYPE` and `LESSCHARSET` environment variables. Added `--login -i` flags to bash for proper shell initialization.
- **src/renderer/components/Terminal.tsx** — No functional changes (previously modified)

### File Tree Watcher Fix
- **src/renderer/components/FileTree.tsx** — Fixed React closure issue where file tree watcher event handler had stale `expandedDirs` state. Added ref to track current expanded state. Removed `expandedDirs` from useEffect dependency array to prevent unnecessary watcher recreation.

## Technical Details

### UTF-8 Encoding Issue
**Problem**: When running the packaged Nova 0.5.0.exe, vim displayed garbled characters for apostrophes and hyphens (e.g., `â€™` instead of `'`). This worked fine in `npm start` but failed in the packaged exe.

**Root Cause**: The `en_US.UTF-8` locale is not available in Git Bash when running in a packaged Electron app environment on Windows. The development environment inherited system locale settings, but the packaged app ran in an isolated environment.

**Solution**:
1. Changed locale to `C.UTF-8` which is a minimal UTF-8 locale available in Git Bash even in packaged scenarios
2. Added additional UTF-8 environment variables:
   - `LC_CTYPE: 'C.UTF-8'` - Controls character classification and case conversion
   - `LESSCHARSET: 'utf-8'` - Ensures `less` and related tools handle UTF-8 properly
3. Added `--login -i` flags to bash for interactive login mode initialization

**Code Changes**:
```typescript
const ptyProcess = pty.spawn(shellPath, ['--login', '-i'], {
  name: 'xterm-256color',
  cols,
  rows,
  cwd: cwdPath,
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    // Force UTF-8 for Git Bash (C.UTF-8 is more portable than en_US.UTF-8)
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    LC_CTYPE: 'C.UTF-8',
    LESSCHARSET: 'utf-8',
    // Add PROMPT_COMMAND to print PWD after every command
    PROMPT_COMMAND: 'echo "__NOVA_PWD__:$(pwd)"',
  },
});
```

### File Tree Watcher Issue
**Problem**: File tree correctly detected file deletions (console showed `[FileTreeWatcher] File removed: ...`) but the UI didn't update to remove the deleted file from the tree view.

**Root Cause**: The `useEffect` hook that sets up the file watcher had `expandedDirs` in its dependency array. This caused:
1. Every time `expandedDirs` changed, the entire watcher was torn down and recreated
2. The event handler captured the `expandedDirs` value from when it was created (closure)
3. When files were deleted, the handler checked the stale `expandedDirs` value
4. It thought directories weren't expanded and skipped the refresh

**Solution**:
1. Created a ref to track the current `expandedDirs` state
2. Updated the ref whenever `expandedDirs` changes
3. Modified the file watcher event handler to use the ref instead of the captured state
4. Removed `expandedDirs` from the useEffect dependency array

**Code Changes**:
```typescript
// Use a ref to track expandedDirs so the file watcher event handler always has the current value
const expandedDirsRef = React.useRef<Set<string>>(expandedDirs);
React.useEffect(() => {
  expandedDirsRef.current = expandedDirs;
}, [expandedDirs]);

// In the file watcher event handler:
const isExpanded = isRootChange || expandedDirsRef.current.has(dirPath);

// Updated useEffect dependency array (removed expandedDirs):
}, [rootPath]); // Only depend on rootPath, not expandedDirs
```

## Testing
- ✅ UTF-8 encoding: Tested vim in packaged exe - apostrophes and hyphens display correctly
- ✅ File tree watcher: Tested file deletion via terminal - tree updates immediately
- ✅ Build: `npm run build` completed successfully
- ✅ No TypeScript errors
- ✅ No linter errors

## Impact
**User-Facing**:
- Terminal now displays UTF-8 characters correctly in packaged exe (fixes vim editing experience)
- File tree UI now updates in real-time when files are deleted via terminal or external tools
- Improved reliability and UX for core Nova features

**Technical**:
- More robust locale handling for Windows environments
- Fixed React state management issue in file tree component
- Improved performance by reducing unnecessary watcher recreation

## Reason
These were critical bugs affecting the core user experience:
1. UTF-8 encoding issue made vim unusable in packaged builds
2. File tree sync issue caused confusion and forced manual refreshes

## Git Commit Hashes
- UTF-8 Fix: `652c897` - Fix UTF-8 encoding in packaged app
- File Tree Fix: `3bc1876` - Fix file tree not updating when files are deleted

## Status
✅ Completed

## Notes
- The UTF-8 fix specifically addresses Windows Git Bash in packaged Electron apps
- The file tree fix is a general React pattern for handling refs in event handlers
- Both fixes are production-ready and tested in the packaged exe environment

