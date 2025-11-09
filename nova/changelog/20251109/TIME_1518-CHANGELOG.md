# DevTools Debug Menu Addition

**Date**: 2025-11-09 15:18  
**Type**: Feature Enhancement  
**Version**: 0.5.0

## Summary

Added a "Debug" menu item to the Nova menu with `Ctrl+Shift+I` keyboard shortcut to toggle Developer Tools. This enables easy access to the browser console for debugging image loading issues and other application functionality.

## Files Changed

### Modified Files

- `src/main/menu.ts`
  - Added `'toggle-devtools'` to `MenuCommand` type
  - Added "Debug" menu item to Nova menu with `CmdOrCtrl+Shift+I` accelerator
  - Positioned between "Command Palette" and "Reset Workspace"

- `src/main/main.ts`
  - Updated `handleMenuCommand()` to handle `'toggle-devtools'` command
  - Calls `window.webContents.toggleDevTools()` directly in main process
  - Logs DevTools toggle action

## Technical Details

### Menu Structure

**Nova Menu** now includes:
```
Nova
├── New Terminal (Ctrl+T)
├── Nova Prompt (Ctrl+Shift+N)
├── Nova Agile (Ctrl+Shift+A)
├── ─────────────
├── Command Palette (Ctrl+P)
├── ─────────────
├── Debug (Ctrl+Shift+I)  ← NEW
├── ─────────────
└── Reset Workspace
```

### Implementation

The DevTools toggle is handled directly in the main process rather than being forwarded to the renderer:

```typescript
if (command === 'toggle-devtools') {
  window.webContents.toggleDevTools();
  logInfo('[Menu] DevTools toggled');
  return;
}
```

This ensures immediate response and works even if the renderer is unresponsive.

### Keyboard Shortcut

- **Windows/Linux**: `Ctrl+Shift+I`
- **macOS**: `Cmd+Shift+I`

This matches the standard browser DevTools shortcut for consistency.

## Usage

**Via Menu**:
1. Click **Nova** → **Debug**
2. DevTools panel will open/close

**Via Keyboard**:
1. Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (macOS)
2. DevTools panel will toggle

## Testing

- **Total Tests**: 471 passed (100%)
- **Build Status**: ✅ Successful
- **Manual Testing**: DevTools opens/closes as expected

## User Impact

Users can now:
- Open Developer Tools via menu
- Use standard keyboard shortcut (`Ctrl+Shift+I`)
- Debug image loading issues
- Inspect console logs and errors
- Monitor network requests
- Debug React components

## Benefits

1. **Debugging Access**: Easy access to browser console for troubleshooting
2. **Standard Shortcut**: Uses familiar browser DevTools keyboard shortcut
3. **Always Available**: Works even when renderer is frozen
4. **Toggle Behavior**: Single action to open/close (no separate commands needed)

## Related Issue

This change was made to help diagnose why images weren't displaying in the image editor tab, enabling users to check console logs for errors without needing to modify code.

## Next Steps

1. User can now open DevTools to check console logs
2. Investigate image loading errors shown in console
3. Fix image display issue in ImageEditor component

## Status

✅ Completed and tested

