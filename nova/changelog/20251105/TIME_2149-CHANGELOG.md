# Changelog: Fix Terminal Restoration and Dirty File Indicator

**Date:** 2025-11-05  
**Time:** 21:49  
**Type:** Bug Fix  
**Component:** App (Workspace Restoration), MonacoEditor (Dirty Indicator)

## Summary

Fixed two user-reported issues:
1. Terminal tabs not being restored from saved workspace
2. White dot indicator not showing for modified files

## Issue 1: Terminal Tabs Not Restored ❌➡️✅

### Problem
When the app was restarted, terminal tabs that were open in the previous session were not restored. The workspace save included terminal information, but it was ignored during restoration.

**Before:**
```typescript
// Restore terminals (don't recreate, just log)
if (workspace.openTerminals && workspace.openTerminals.length > 0) {
  console.log('[App] Workspace had', workspace.openTerminals.length, 'terminals (not restored)');
}
```

### Solution
Implemented proper terminal tab restoration similar to how file tabs are restored.

**After:**
```typescript
// Restore terminals
if (workspace.openTerminals && workspace.openTerminals.length > 0) {
  setTimeout(() => {
    for (const terminalInfo of workspace.openTerminals) {
      const terminalId = `terminal-${Date.now()}-${Math.random()}`;
      
      // Add terminal tab
      tabBarAPI.addTab({
        id: terminalId,
        type: 'terminal',
        filePath: terminalId,
        fileName: terminalInfo.name || 'bash',
        isDirty: false,
        content: '',
        language: 'terminal',
      });
      
      // Add to terminal tabs state to trigger rendering
      setTerminalTabs(prev => [...prev, { 
        id: terminalId, 
        fileName: terminalInfo.name || 'bash', 
        workspaceRoot 
      }]);
    }
  }, 600);
}
```

### Features
- ✅ Terminal tabs are now restored on app restart
- ✅ New PTY sessions are created for each restored terminal
- ✅ Terminal count and names are preserved
- ✅ Also implemented Nova Prompt tab restoration (same logic)

## Issue 2: White Dot Indicator Not Showing ❌➡️✅

### Problem
The white dot (●) indicator for modified files was not appearing even when files were edited. This was a **closure stale value bug**.

**Root Cause:**
The Monaco change listener was set up in a `useEffect` with empty dependencies:
```typescript
useEffect(() => {
  const disposable = editorRef.current.onDidChangeModelContent(() => {
    const currentContent = editorRef.current.getValue();
    const dirty = currentContent !== savedContent; // ❌ savedContent is stale!
    // ...
  });
  // ...
}, []); // Empty deps - savedContent captured at mount time only!
```

When a file was loaded:
1. `setSavedContent(content)` updated the state
2. But the change listener closure **still had the old `savedContent` value**
3. So `currentContent !== savedContent` always gave wrong results

### Solution
Use a **ref** to store `savedContent` so the change listener can access the current value without recreating the listener.

**Changes:**
```typescript
// 1. Add ref to store current saved content
const savedContentRef = useRef('');

// 2. Update listener to use ref instead of state
const disposable = editorRef.current.onDidChangeModelContent(() => {
  const currentContent = editorRef.current.getValue();
  const dirty = currentContent !== savedContentRef.current; // ✅ Always current!
  // ...
});

// 3. Update ref whenever saved content changes
const loadFile = (filePath, content) => {
  setSavedContent(content);
  savedContentRef.current = content; // ✅ Keep ref in sync
  // ...
};

const markAsSaved = () => {
  const content = editorRef.current.getValue();
  setSavedContent(content);
  savedContentRef.current = content; // ✅ Keep ref in sync
  // ...
};
```

### Why This Works
- **Refs don't trigger re-renders** but always have the current value
- **Closures can access ref.current** and get the latest value
- **No need to recreate the listener** on every content change
- **Performance is maintained** while fixing the bug

## Files Changed

### 1. src/renderer/components/App.tsx
**Terminal & Nova Prompt Restoration:**
- Lines 241-311: Implemented terminal tab restoration
- Created tabs and state updates for each saved terminal
- Restored Nova Prompt tabs with same logic
- Used 600ms delay to ensure TabBar API is ready

### 2. src/renderer/components/MonacoEditor.tsx
**Dirty Indicator Fix:**
- Line 51: Added `savedContentRef` to store current saved content
- Line 135: Changed listener to use `savedContentRef.current` instead of `savedContent`
- Line 308: Update ref in `loadFile()` when file is loaded
- Line 329: Update ref in `markAsSaved()` when file is saved

## Technical Details

### Closure Stale Value Problem
This is a common React bug pattern:
```typescript
useEffect(() => {
  const callback = () => {
    console.log(stateValue); // Captures stateValue at setup time
  };
  someAPI.addEventListener('change', callback);
}, []); // Empty deps means callback never updates
```

**Solutions:**
1. Add state to dependencies (causes re-setup on every change - not ideal)
2. Use ref to store value (optimal - no re-setup needed)
3. Use state updater function if modifying the same state

We chose option 2 (ref) for performance.

## User Experience

### Before Fixes:
- ❌ Terminal tabs lost on app restart
- ❌ No visual indication of unsaved changes
- ❌ Users couldn't tell which files were modified
- ❌ Risk of losing changes by accidentally closing tabs

### After Fixes:
- ✅ Terminal tabs restored on restart
- ✅ White dot (●) appears when file is modified
- ✅ Dot disappears after saving
- ✅ Clear visual feedback for unsaved work
- ✅ Better UX consistency

## Testing

Manual testing checklist:
- ✅ Build successful
- ✅ No linter errors
- ✅ Edit a file → white dot appears
- ✅ Save file → white dot disappears
- ✅ Open terminal → close app → reopen → terminal tab restored
- ✅ Multiple terminals → all restored correctly
- ✅ Nova Prompt tabs also restore correctly

## Future Improvements

For terminal restoration:
- Consider preserving terminal working directory
- Maybe save last N lines of terminal history
- Restore terminal titles if user renamed them

For dirty indicator:
- Consider showing file path in tooltip
- Maybe add unsaved changes count in status bar
- Ctrl+S to save should also trigger visual feedback

## Impact

**Severity:** Medium  
**User Impact:** Moderate - Quality of life improvements  
**User Satisfaction:** High - Requested features now working  

Both issues were user-reported and are now fully resolved! 🎉

