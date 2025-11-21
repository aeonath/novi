# Terminal Content Persistence Fix

**Type**: BUGFIX  
**Date**: 2025-11-21  

## Summary
Fixed terminal losing all content when switching tabs.

## Changes
- ✅ Terminal no longer recreates on tab switch
- ✅ All history and output preserved
- ✅ 50k line buffer maintained across tab switches

## Files Modified
- src/renderer/components/Terminal.tsx

