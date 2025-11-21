# Bugfix: Terminal First Line Truncation — 20251121.0837

## Summary
Fixed issue where the first line of terminal output was being cut off, with characters disappearing when switching between tabs. The terminal was losing 2+ characters from the first line when switching from another editor tab back to the terminal tab.

## Problem Description
Users reported:
- First line of terminal output showing incomplete text (e.g., "k" instead of full prompt)
- When opening a terminal, then switching to an editor tab, then returning to the terminal, the first line would lose characters
- The beginning of the first line was being visually cut off

**Root Causes**:
1. **Insufficient Scrollback Buffer**: The terminal had only 1000 lines of scrollback, which could cause early lines to be discarded during resize operations
2. **Scroll Position Not Preserved**: When refitting the terminal on tab switch, the code always scrolled to bottom, which could cause the viewport to shift incorrectly if the user wasn't already at the bottom
3. **No Padding**: Terminal container had no padding, causing the first line to render flush against the top edge where it could be partially obscured

## Files Changed

### Modified
- **src/renderer/components/Terminal.tsx**
  - Line 158: Increased `scrollback` from 1000 to 10000 to prevent losing historical output
  - Lines 300-310: Added scroll position preservation logic - saves viewport position before resize and restores it after
  - Lines 320-327: Only scroll to bottom if terminal was already at bottom before resize, otherwise restore original scroll position
  - Line 433: Added 4px padding to terminal container to prevent first line from being visually cut at edges

## Technical Details

### Change 1: Increased Scrollback Buffer
```typescript
// Before
scrollback: 1000,

// After
scrollback: 10000, // Increased from 1000 to prevent losing top lines
```

### Change 2: Preserve Scroll Position During Resize
```typescript
// Save current scroll position to preserve view
const scrollY = terminalRef.current.buffer.active.viewportY;
const baseY = terminalRef.current.buffer.active.baseY;

// ... perform resize ...

// If we were at the bottom before resize, stay at bottom
// Otherwise restore scroll position to prevent first line from being cut
const wasAtBottom = scrollY === baseY;
if (wasAtBottom) {
  terminalRef.current.scrollToBottom();
} else {
  // Restore scroll position to preserve view
  terminalRef.current.scrollToLine(scrollY);
}
```

### Change 3: Add Container Padding
```typescript
style={{
  // ... other styles ...
  padding: '4px', // Add padding to prevent first line from being cut off at edges
}}
```

## Testing
- Manual testing confirmed:
  - ✅ First line of terminal displays completely
  - ✅ No characters lost when switching tabs
  - ✅ Scroll position preserved when switching between terminal and editor tabs
  - ✅ Terminal stays scrolled to bottom when appropriate
  - ✅ Visual padding prevents top line from touching edge
- All 574 unit tests passing ✅

## User-Facing Impact
**HIGH IMPACT FIX**
- Terminal output now displays completely from the first line
- No more missing characters when switching between tabs
- Better visual appearance with padding around terminal content
- Scroll position intelligently preserved during tab switches
- More reliable terminal history with 10x larger scrollback buffer

## Build Process
```bash
npm run build  # Successful compilation
npm test       # All 574 tests passing
```

## Git Commit Hash
`TBD` - Bugfix: Fix terminal first line truncation and character loss on tab switch

## Status
✅ Completed

## Related Issues
- User reported: "the first line of the terminal is getting cut off, see the output k ... and when you open a terminal tab then open another editor tab and go back the the terminal the first line in the terminal loses about 2 characters at least sometimes more"
- Affects: All users switching between terminal and editor tabs
- Severity: Medium-High (terminal output reliability)

## Future Considerations
- Monitor xterm.js scrollback memory usage with 10000 lines (should be fine, but worth tracking)
- Consider making scrollback size configurable in settings
- May want to add visual indicators when terminal buffer is nearly full

