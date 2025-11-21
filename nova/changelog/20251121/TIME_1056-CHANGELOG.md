# Terminal Buffer and Cursor — 20251121.1056

## Summary
Improved terminal scroll position preservation, increased buffer size to 50k lines, and changed cursor to non-blinking bold underline.

## Files Changed
- src/renderer/components/Terminal.tsx — Changed cursor settings and scroll behavior

## Changes Made
1. **Scrollback Buffer**: Increased from 10,000 to 50,000 lines
2. **Cursor Style**: Changed from blinking block to solid bold underline
   - `cursorBlink: false` (was true)
   - `cursorStyle: 'underline'` (was 'block')
   - `cursorWidth: 2` (new, makes it bold)
3. **Scroll Preservation**: Removed `scrollToBottom()` call on tab switch
   - Terminal now preserves exact scroll position when navigating away and back

## Reason
User requested larger buffer to retain command history, non-blinking cursor for readability, and scroll position preservation for better terminal UX.

## Git Commit Hash
`TBD` - Terminal buffer and cursor improvements

## Status
✅ Completed

