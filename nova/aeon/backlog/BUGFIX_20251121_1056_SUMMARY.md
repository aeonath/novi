# Terminal Buffer and Cursor Improvements

**Type**: BUGFIX  
**Date**: 2025-11-21  

## Summary
Improved terminal UX with larger buffer, non-blinking cursor, and scroll position preservation.

## Changes
- ✅ Increased scrollback buffer to 50,000 lines
- ✅ Changed cursor to non-blinking bold underline
- ✅ Preserved scroll position when switching tabs

## Files Modified
- src/renderer/components/Terminal.tsx

