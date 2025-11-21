# Fix Terminal Scroll Behavior

**Type**: BUGFIX  
**Date**: 2025-11-21  

## Summary
Fixed terminal prompt truncation by limiting scroll to initial render only.

## Changes
- ✅ Removed scroll on every data write
- ✅ onRender only executes once with hasRendered flag
- ✅ Terminal position stable after initial display
- ✅ No more truncated prompts on restore

## Files Modified
- src/renderer/components/Terminal.tsx

