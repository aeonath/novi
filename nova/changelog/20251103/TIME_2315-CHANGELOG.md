# Windows Fix — Force Window to Foreground — 20251103.2315

## Summary
Added Windows-specific code to force the Nova window to the foreground when launched. On Windows, normal focus() calls don't always bring the window to the front.

## Files Changed
- `src/main/main.ts` — Added Windows-specific foreground forcing logic

## Technical Details

**Problem:**
On Windows, calling `mainWindow.focus()` doesn't reliably bring the window to the foreground when launched with `npm start`. The window would remain in the background behind other applications.

**Solution:**
Implemented a Windows-specific workaround that temporarily sets the window as always-on-top, focuses it, then removes the always-on-top flag:

```typescript
// Show window when ready to prevent white screen
mainWindow.once('ready-to-show', () => {
  mainWindow.show();
  
  // Force window to foreground on Windows
  if (process.platform === 'win32') {
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
  } else {
    mainWindow.focus();
  }
  
  logInfo('Window shown and focused');
});
```

**How It Works:**
1. Check if platform is Windows (`process.platform === 'win32'`)
2. Temporarily set window as always-on-top
3. Focus the window
4. Immediately remove always-on-top flag
5. On other platforms (macOS, Linux), use normal focus()

This is a well-known Electron pattern for forcing foreground focus on Windows.

## User Impact
Nova window now properly comes to the foreground on Windows when launched, making it immediately visible and ready to use.

## Test Results
- ✅ Build successful
- ✅ No breaking changes

## Git Commit Hash
TBD - Windows Fix: Force window to foreground

## Status
✅ Completed

## Related Sprint/Task
Sprint 4 Task 3 - File System Browser (Windows compatibility fix)

