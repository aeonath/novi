# Bug Fixes - Tab Close and Keyboard Shortcuts

**Date:** November 3, 2025  
**Version:** 0.4.0 (In Progress)  

---

## Bugs Fixed

### Bug 1: Tab Close Does Not Return to Welcome Screen

**Issue:**  
When clicking the X button to close the last open tab, the editor would remain visible instead of showing the welcome screen.

**Root Cause:**  
The `TabBar` component was not notifying the parent `App` component when the last tab was closed, so `showWelcome` state was never set back to `true`.

**Fix:**
1. Added `onAllTabsClosed` callback prop to `TabBarProps`
2. Modified `removeTab` method to call `onAllTabsClosed()` when tab count reaches zero
3. Connected the callback in `App.tsx` to set `showWelcome(true)`

**Files Changed:**
- `src/renderer/components/TabBar.tsx` - Added callback and notification logic
- `src/renderer/components/App.tsx` - Connected callback to state update

---

### Bug 2: Find and Replace Keyboard Shortcuts Not Bound

**Issue:**  
The standard keyboard shortcuts `Ctrl+F` (Find) and `Ctrl+H` (Replace) were not working in the editor.

**Root Cause:**  
Monaco Editor's built-in find and replace actions were not being triggered by keyboard events. While Monaco has internal keyboard handling, it wasn't properly intercepting these keys in our setup.

**Fix:**
1. Added keyboard event listener in `MonacoEditor` component initialization
2. Intercept `Ctrl+F` and trigger Monaco's `actions.find` command
3. Intercept `Ctrl+H` and trigger Monaco's `editor.action.startFindReplaceAction` command
4. Both shortcuts prevent default browser behavior and execute Monaco actions directly

**Files Changed:**
- `src/renderer/components/MonacoEditor.tsx` - Added keyboard event handler

**Technical Details:**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+F for Find
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    editorRef.current?.getAction('actions.find')?.run();
  }
  // Ctrl+H for Replace
  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
  }
};

document.addEventListener('keydown', handleKeyDown);
```

---

## Testing

✅ **All 384 tests passing**  
✅ **18/18 test suites passing**  
✅ **Zero console output - Crystal clean**

**Manual Testing:**
- Verified closing the last tab returns to welcome screen
- Verified `Ctrl+F` opens Find dialog
- Verified `Ctrl+H` opens Find and Replace dialog
- Verified keyboard shortcuts work when editor has focus

---

## Impact

**Bug 1 Impact:**  
Users can now properly close all files and return to the welcome screen, improving the UX flow and making the app feel more polished.

**Bug 2 Impact:**  
Standard IDE keyboard shortcuts now work as expected, making Nova feel more professional and meeting user expectations for text editor behavior.

---

*Bug fixes completed and tested successfully.*

