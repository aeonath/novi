# Changelog: Modified File Indicator & Save Confirmation Dialog

**Date:** 2025-11-05  
**Time:** 00:45  
**Type:** Feature  
**Component:** TabBar, SavePrompt

## Summary

Added visual indicators for modified files and a beautiful save confirmation dialog that prompts users when trying to close unsaved files. This prevents accidental data loss and provides clear visual feedback about file state.

## New Features

### 1. Modified File Indicator ✅
- **White circular dot** (●) appears on tabs with unsaved changes
- Color: `#e0e0e0` (whitish, as requested)
- Font size: `14px` for visibility
- Appears only on file tabs (not terminal/prompt tabs)
- Automatically disappears when file is saved
- Reappears when file is modified again

### 2. Save Confirmation Dialog ✅
- **Beautiful custom dialog** matching Nova's dark theme
- Shows when closing a modified file
- Three action buttons:
  - **Save** (blue) - Saves and closes
  - **Don't Save** (red) - Discards and closes
  - **Cancel** (gray) - Keeps tab open
- Displays filename with bold emphasis
- Clear warning message about data loss
- Modal overlay with backdrop blur
- Keyboard-friendly with hover states

## Changes

### New Files

1. **src/renderer/components/SavePrompt.tsx** (170 lines)
   - Custom dialog component
   - Three-button action layout
   - Theme-matched styling
   - Hover effects on buttons

### Modified Files

1. **src/renderer/components/TabBar.tsx**
   - Updated `dirtyIndicator` style from blue to whitish
   - Increased font size from default to 14px
   - Already had the indicator logic in place

2. **src/renderer/components/App.tsx**
   - Added `SavePrompt` import
   - Added `savePrompt` state management
   - Updated `onTabClose` handler to show dialog for dirty files
   - Implemented save/discard/cancel handlers
   - Integrated Monaco save functionality

## Technical Details

### Modified File Detection

Files are marked as "dirty" (modified) through the existing TabBar API:
```typescript
(window as any).__tabBarAPI.updateTabDirty(tabId, true)
```

The dirty state is tracked per-tab and persists until:
- File is saved (sets dirty to false)
- Tab is closed (after user confirms)

### Save Dialog Flow

```
User closes modified file
        ↓
onTabClose detects isDirty = true
        ↓
Show SavePrompt with Promise
        ↓
User chooses action:
  - Save → Save file → Close tab
  - Don't Save → Close tab
  - Cancel → Keep tab open
        ↓
Promise resolves with boolean
        ↓
TabBar closes tab (or keeps it)
```

### Async Promise Pattern

The dialog uses a Promise-based pattern to make the async UI action synchronous for the tab close handler:

```typescript
return new Promise<boolean>((resolve) => {
  setSavePrompt({
    show: true,
    fileName: tab.fileName,
    tabId: tabId,
    resolve: resolve, // Store resolve function
  });
});
```

When user clicks a button, the stored `resolve` function is called with `true` (close) or `false` (cancel).

## Styling

### Modified Indicator
- Color: `#e0e0e0` (bright white)
- Symbol: `●` (bullet point)
- Position: After filename
- Font weight: Bold

### Save Dialog
- Background: `#252526` (Nova dark)
- Border: `#454545` (subtle)
- Overlay: `rgba(0, 0, 0, 0.6)` (dark backdrop)
- Shadow: `0 8px 24px rgba(0, 0, 0, 0.5)`
- Border radius: `6px` (modern rounded)

### Button Colors
- **Save**: `#0e7aca` (Nova blue) → `#0e639c` (hover)
- **Don't Save**: `#a01c1c` (red) → `#c72e2e` (hover)
- **Cancel**: `#2d2d30` (gray) → `#3e3e42` (hover)

## User Experience

### Visual Feedback
1. **At a glance**: White dot tells you which files have unsaved changes
2. **Clear choice**: Three distinct buttons with color-coded actions
3. **No surprises**: Warning message explains what will happen
4. **Safe default**: Cancel is easily accessible

### Workflow Protection
- Prevents accidental data loss
- Gives users control over save decisions
- Works seamlessly with Ctrl+S save shortcut
- Dialog only appears when necessary

## Testing

- ✓ Build successful
- ✓ No linter errors
- ✓ White dot appears on modified files
- ✓ Dot disappears after save
- ✓ Dialog appears when closing dirty file
- ✓ Save button saves and closes
- ✓ Don't Save discards and closes
- ✓ Cancel keeps tab open
- ✓ Works for all file types
- ✓ Doesn't affect terminal/prompt tabs

## Future Enhancements

Possible improvements for future iterations:
- Show list of all unsaved files when closing multiple tabs
- Keyboard shortcuts (Enter = Save, Esc = Cancel)
- Remember user preference (always save/discard)
- Dirty indicator in title bar for unfocused tabs
- Auto-save option

## Examples

**Tab with unsaved changes:**
```
[filename.ts ●]  [X]
```

**Save prompt dialog:**
```
┌─────────────────────────────────────┐
│ Unsaved Changes                     │
├─────────────────────────────────────┤
│                                     │
│ Do you want to save the changes to  │
│ filename.ts?                        │
│                                     │
│ Your changes will be lost if you    │
│ don't save them.                    │
│                                     │
├─────────────────────────────────────┤
│         [Cancel] [Don't Save] [Save]│
└─────────────────────────────────────┘
```

## Acceptance Criteria Met

✅ Modified file indicator appears on tabs  
✅ Indicator is whitish and circular  
✅ Indicator disappears when file is saved  
✅ Indicator reappears when file is modified  
✅ Prompt appears when closing modified file  
✅ Dialog matches Nova's style and theme  
✅ Save option saves and closes  
✅ Don't Save option closes without saving  
✅ Cancel option keeps tab open  

Great foundation for data loss prevention! 🎉

