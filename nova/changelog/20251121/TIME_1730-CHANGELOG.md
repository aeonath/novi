# Changelog: Terminal History Preservation, Prompt Display, and PWD Tracking Fixes

**Date:** 2025-11-21
**Time:** 17:30
**Type:** Bugfix
**Sprint:** Sprint 5 (v0.5.0)
**Category:** Terminal Component

## Summary

Fixed three critical terminal issues that were causing poor user experience:
1. **Terminal history loss on tab switch** - Terminal buffer was being destroyed when navigating away
2. **Initial prompt cutoff** - First line of terminal prompt was getting truncated
3. **Missing PWD in tab title** - Terminal tabs showed static "bash" instead of current directory

## Problem Analysis

### Issue 1: Terminal History Loss
**Root Cause:** The `useEffect` cleanup function in `Terminal.tsx` (lines 238-243) was calling `terminal.dispose()`, which destroyed the xterm.js instance and its buffer whenever the component unmounted. React was unmounting inactive terminal components even though they were kept in the DOM with `display: none`.

**Symptoms:**
- Navigating away from a terminal tab and returning showed an empty terminal
- All command history and output was lost
- Terminal scrollback buffer was cleared

### Issue 2: Prompt Cutoff
**Root Cause:** The initial terminal rendering did not include a scroll-to-bottom after the fit operation. When the terminal was first created or restored from workspace, the viewport was not positioned at the bottom, causing the prompt to be partially visible.

**Symptoms:**
- First line of bash prompt showing only "k" instead of "Aeonath4@SONNET"
- Prompt characters missing when switching tabs
- User had to manually scroll down to see full prompt

### Issue 3: Missing PWD in Tab Title
**Root Cause:** Previous PWD tracking implementation was completely removed in the simplification refactor. The terminal tabs showed a static "bash" title with no indication of the current working directory.

**Symptoms:**
- All terminal tabs showed identical "💻 bash" title
- No way to distinguish terminals in different directories
- Difficult to navigate between multiple terminal tabs

## Technical Solution

### Fix 1: Terminal History Preservation

Modified the cleanup function in `Terminal.tsx` to NOT dispose the xterm instance:

```typescript
// Cleanup - CRITICAL: Only disconnect observer, DON'T dispose terminal
// Terminal must persist across tab switches to preserve history
return () => {
  console.log('[Terminal] Cleanup: Disconnecting resize observer (terminal persists)');
  resizeObserver.disconnect();
  // DO NOT dispose terminal here - it should persist
};
```

**Key Changes:**
- Removed `terminal.dispose()` from cleanup
- Removed `terminalRef.current = null` assignments
- Added `isActive` back to the dependency array (line 247) to properly handle focus
- Added guard `|| terminalRef.current` (line 132) to prevent recreation if terminal exists

**Result:** The xterm instance and its 50,000-line scrollback buffer now persist across tab switches, maintaining all terminal history.

### Fix 2: Initial Prompt Display

Added scroll-to-bottom logic after the initial fit operation:

```typescript
// Simple approach: fit immediately using RAF, then scroll to bottom
requestAnimationFrame(() => {
  fitAddon.fit();
  const cols = terminal.cols;
  const rows = terminal.rows;
  console.log('[Terminal] Terminal fit:', cols, 'x', rows);
  
  // Sync PTY dimensions
  if (onResizeRef.current) {
    onResizeRef.current(cols, rows);
  }
  
  // CRITICAL: Scroll to bottom after initial fit to show full prompt
  requestAnimationFrame(() => {
    terminal.scrollToBottom();
    console.log('[Terminal] Initial scroll to bottom completed');
  });
  
  // Mark as ready
  hasInitialFitRef.current = true;
  setIsReady(true);
  
  // Focus if active
  if (isActive) {
    terminal.focus();
  }
});
```

Also updated tab switching logic to always scroll to bottom:

```typescript
// CRITICAL: Always scroll to bottom when switching to this terminal
// This ensures the prompt is always visible and not cut off
terminalRef.current.scrollToBottom();
console.log('[Terminal] Tab switched - scrolled to bottom');
```

**Result:** Terminal always displays the full prompt, both on initial creation and when switching tabs.

### Fix 3: PWD Tracking in Tab Title

Implemented a simple PWD extraction mechanism that parses terminal output:

**Terminal.tsx Changes:**
1. Added `onPwd?: (pwd: string) => void` callback prop
2. Added `terminalBufferRef` to accumulate terminal output
3. Added PWD extraction logic in the `write()` API method:

```typescript
// Accumulate data in buffer for PWD detection
terminalBufferRef.current += data;

// Keep buffer manageable (last 5000 chars should be enough to catch prompts)
if (terminalBufferRef.current.length > 5000) {
  terminalBufferRef.current = terminalBufferRef.current.slice(-5000);
}

// Try to extract PWD from the accumulated buffer
// Look for common Git Bash prompt patterns like: "user@host MINGW64 /c/Work/project"
const pwdMatch = terminalBufferRef.current.match(/MINGW64\s+([^\r\n$:]+)/);
if (pwdMatch && onPwdRef.current) {
  const rawPwd = pwdMatch[1].trim();
  // Clean up the path (remove ANSI codes if any remain)
  const cleanPwd = rawPwd.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
  if (cleanPwd && cleanPwd.startsWith('/') && cleanPwd !== '/') {
    onPwdRef.current(cleanPwd);
  }
}
```

**App.tsx Changes:**
1. Added `handleTerminalPwd` callback:

```typescript
const handleTerminalPwd = useCallback((terminalId: string, pwd: string) => {
  console.log(`[App] Terminal ${terminalId} PWD detected: ${pwd}`);
  
  // Extract directory name from path (last segment)
  const dirName = pwd.split('/').filter(Boolean).pop() || pwd;
  
  // Update tab title to show PWD
  const tabBarAPI = (window as any).__tabBarAPI;
  if (tabBarAPI) {
    tabBarAPI.updateTabFileName(terminalId, `💻 ${dirName}`);
  }
}, []);
```

2. Passed `onPwd` prop to Terminal components
3. Changed initial tab title from "💻 Terminal" to "💻 bash"

**Result:** Terminal tabs now dynamically update to show "💻 {directory-name}" based on the current working directory extracted from the bash prompt.

## Files Modified

1. **src/renderer/components/Terminal.tsx**
   - Modified `TerminalProps` interface to add `onPwd` callback
   - Added `terminalBufferRef` and `onPwdRef` to component state
   - Modified cleanup function to NOT dispose terminal
   - Added scroll-to-bottom after initial fit
   - Added PWD extraction logic in `write()` API
   - Updated tab switching to always scroll to bottom

2. **src/renderer/components/App.tsx**
   - Added `handleTerminalPwd` callback
   - Updated Terminal component rendering to pass `onPwd` prop
   - Changed initial terminal tab title from "💻 Terminal" to "💻 bash"

## Implementation Details

### Terminal Lifecycle Management
- Terminal instances are now created ONCE and persist for the lifetime of the tab
- Only the `ResizeObserver` is disconnected during cleanup
- The xterm instance remains in memory with its full 50,000-line buffer
- Tab switching uses `display: none` CSS instead of unmounting

### PWD Detection Strategy
- **Pattern Matching:** Looks for `MINGW64 {path}` in terminal output (Git Bash specific)
- **Buffer Management:** Keeps last 5000 characters to catch prompts without memory bloat
- **ANSI Cleaning:** Strips escape codes from extracted paths
- **Directory Name:** Extracts only the last segment of the path for compact tab titles

### Scroll Behavior
- **Initial Render:** Double `requestAnimationFrame` ensures DOM is ready, then scrolls to bottom
- **Tab Switch:** Always scrolls to bottom when becoming active
- **Rationale:** Ensures prompt is always visible; user can scroll up if needed

## Testing Recommendations

1. **Terminal History:**
   - Run several commands in a terminal
   - Switch to a different tab (editor or another terminal)
   - Switch back to the original terminal
   - Verify all output and history is preserved

2. **Prompt Display:**
   - Create a new terminal
   - Verify the full prompt is visible (e.g., "Aeonath4@SONNET MINGW64 /c/Work/nova")
   - Switch tabs and return
   - Verify prompt remains fully visible

3. **PWD Tracking:**
   - Create a terminal (should show "💻 bash")
   - Navigate to different directories using `cd`
   - Verify tab title updates to "💻 {directory-name}"
   - Open multiple terminals in different directories
   - Verify each shows its unique directory name

## Known Limitations

1. **Git Bash Specific:** PWD detection regex is tailored to Git Bash prompt format. Other shells (PowerShell, WSL, etc.) may require additional patterns.

2. **Last Segment Only:** Tab titles show only the last directory name, not the full path. This keeps tabs compact but may cause ambiguity if multiple terminals are in directories with the same name.

3. **Scroll Position:** Always scrolling to bottom on tab switch means any manual scrolling up to view history is lost when switching tabs.

## Future Improvements

1. Support additional shell prompt formats (PowerShell, WSL bash, zsh, fish)
2. Option to preserve scroll position on tab switch
3. Tooltip on tab hover showing full path
4. Configurable PWD display format (last segment vs full path vs relative path)

## References

- Original issue report: User reported "terminal history is no longer preserved" and "prompt is still cut off"
- Related fixes:
  - Initial terminal cutoff fix (TIME_0837)
  - Terminal scroll behavior fix (TIME_1056)
  - Terminal implementation simplification (TIME_1325)

---

**Status:** ✅ Complete
**Build Status:** ✅ Passing
**Linter Status:** ✅ No errors
