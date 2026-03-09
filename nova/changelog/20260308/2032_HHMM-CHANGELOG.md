# Changelog — 20260308.2032

## Ad hoc: Fix Ctrl+Tab tab cycling not working in terminals

### Problem
Ctrl+Tab and Ctrl+Shift+Tab keyboard shortcuts for cycling between tabs didn't work when a terminal (or Novi Shell) was focused. The shortcut handler existed in App.ts but never fired.

### Root Cause
xterm.js captures all keyboard events by default and doesn't propagate them to the document. The document-level `keydown` listener in `setupKeyboardShortcuts()` never received Ctrl+Tab when the terminal had focus.

### Fix
- **`src/renderer/components/Terminal.ts`**: Added `attachCustomKeyEventHandler` to the xterm instance that returns `false` for Ctrl+Tab events, allowing them to bubble up to the document for tab cycling.
- **`src/renderer/components/NoviShell.ts`**: Same fix applied to the Novi Shell xterm instance.

### Files Changed
- `src/renderer/components/Terminal.ts`
- `src/renderer/components/NoviShell.ts`

### Test Results
- 39 suites, 638 tests — all passing
- Build compiles successfully

### Commit
TBD
