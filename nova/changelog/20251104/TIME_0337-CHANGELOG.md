# Changelog - Replace Toggle Theme with New Terminal in Action HUD

**Date:** November 4, 2025, 03:37  
**Sprint:** 4  
**Task:** Task 5 Enhancement  
**Type:** UI Improvement

---

## Summary

Replaced "Toggle Theme" action with "New Terminal" action in the Action HUD. Users can now quickly open a new terminal tab directly from the command palette (Ctrl+K or Ctrl+Space).

---

## Changes Made

### Action HUD Update

**Before**: Action HUD contained "Toggle Theme" as the 6th action  
**After**: Action HUD now contains "New Terminal" as the 6th action

**Action List** (8 total):
1. Open File
2. Save File
3. Save File As...
4. Reload File
5. Close File
6. **New Terminal** ← **REPLACED Toggle Theme**
7. Settings
8. System Diagnostics

### Implementation Details

**1. Updated ActionContext Interface** (`src/renderer/components/actions.ts`):
```typescript
// Before
onToggleTheme?: () => void | Promise<void>;

// After
onNewTerminal?: () => void | Promise<void>;
```

**2. Updated Action Definition** (`src/renderer/components/actions.ts`):
```typescript
// Before
actions.push({
  id: 'toggle-theme',
  label: 'Toggle Theme',
  handler: () => {
    callHandler(context.onToggleTheme);
  },
});

// After
actions.push({
  id: 'new-terminal',
  label: 'New Terminal',
  handler: () => {
    callHandler(context.onNewTerminal);
  },
});
```

**3. Added Terminal Creation Handler** (`src/renderer/components/App.tsx`):
- Added `onNewTerminal` to `actionContext`
- Reuses the same terminal creation logic used by FileTree context menu
- Creates terminal session, adds tab, switches to terminal tab

**4. Connected FileTree to Action Handler** (`src/renderer/components/App.tsx`):
- FileTree's `onNewTerminal` now uses `actionContext.onNewTerminal`
- Ensures consistent behavior between context menu and Action HUD

**5. Updated Unit Tests** (`src/tests/core-0.2.0/actions.test.ts`):
- Replaced all `onToggleTheme` references with `onNewTerminal`
- Updated test expectations from `'toggle-theme'` to `'new-terminal'`
- Updated test descriptions and assertions
- All 13 tests passing ✅

---

## User Experience

### Before
- Users could toggle theme from Action HUD
- No quick way to open terminal from keyboard

### After
- Users can open terminal via Action HUD (Ctrl+K → "New Terminal")
- Terminal creation available from both:
  - **Action HUD**: Ctrl+K / Ctrl+Space → "New Terminal"
  - **FileTree Context Menu**: Right-click → "New Terminal"
- Consistent behavior across both entry points

---

## Technical Details

### Action Handler Implementation

The `onNewTerminal` handler in App.tsx:
1. Checks if terminal API is available
2. Creates terminal session via IPC (`terminalCreate`)
3. Hides welcome screen
4. Adds terminal tab to TabBar
5. Switches to terminal tab automatically
6. Updates status bar to "Terminal: bash"

### Code Reuse

Both FileTree context menu and Action HUD now use the same `actionContext.onNewTerminal` handler, ensuring:
- Consistent behavior
- Single source of truth
- Easier maintenance

---

## Files Modified

1. **src/renderer/components/actions.ts**
   - Removed `onToggleTheme` from ActionContext interface
   - Added `onNewTerminal` to ActionContext interface
   - Replaced "Toggle Theme" action with "New Terminal" action

2. **src/renderer/components/App.tsx**
   - Added `onNewTerminal` handler to actionContext
   - Connected FileTree's `onNewTerminal` prop to actionContext handler
   - Added `workspaceRoot` to actionContext dependency array

3. **src/tests/core-0.2.0/actions.test.ts**
   - Updated all test cases to use `onNewTerminal` instead of `onToggleTheme`
   - Updated action ID expectations from `'toggle-theme'` to `'new-terminal'`
   - Updated action label expectations from `'Toggle Theme'` to `'New Terminal'`
   - Updated test descriptions

---

## Testing

### Unit Tests

✅ **All Actions Tests Passing**: 13 tests, 100% pass rate

**Test Results**:
```
PASS src/tests/core-0.2.0/actions.test.ts
  Actions
    createDefaultActions
      ✓ should create default actions with all handlers
      ✓ should call onOpenFile handler when Open File action is executed
      ✓ should call onNewTerminal handler when New Terminal action is executed  ← NEW
      ✓ should call onOpenSettings handler when Settings action is executed
      ✓ should handle missing handlers gracefully
      ✓ should handle async handlers
      ✓ should create actions with correct structure
      ✓ should create all eight default actions
      ✓ should call onReloadFile handler when Reload File action is executed
      ✓ should call onCloseFile handler when Close File action is executed
      ✓ should call onOpenDiagnostics handler when System Diagnostics action is executed
      ✓ should call onSaveFile handler when Save File action is executed
      ✓ should call onSaveFileAs handler when Save File As action is executed

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

### Build Verification

✅ **TypeScript Compilation**: Passes  
✅ **Linter**: No errors  
✅ **Bundle**: Creates successfully  
⚠️ **Warning**: Case sensitivity warning for Terminal.tsx import (pre-existing, non-blocking)

---

## Rationale

### Why Replace Toggle Theme?

1. **Terminal is More Frequently Used**: Developers need quick access to terminal more often than theme switching
2. **Keyboard Accessibility**: Action HUD provides keyboard-first access to terminal (Ctrl+K)
3. **Consistency**: Both context menu and Action HUD now offer terminal creation
4. **Theme Switching**: Can be moved to Settings panel or application menu where it belongs

### Future Considerations

- Theme switching can be added to Settings panel
- Application menu can include theme options
- Keyboard shortcut can be added directly (e.g., Ctrl+Shift+T for terminal)

---

## Related Changes

This change complements the terminal implementation from Sprint 4 Task 5:
- Terminal tabs are now accessible via Action HUD
- Provides keyboard-first workflow for terminal access
- Maintains consistency with FileTree context menu

---

## Commit Hash

`TBD` - Sprint4 Task5: Replace Toggle Theme with New Terminal in Action HUD

---

## Status

✅ **Completed**

All changes implemented and tested:
- ✅ Action HUD updated with "New Terminal"
- ✅ FileTree connected to shared handler
- ✅ All unit tests updated and passing
- ✅ Build successful

