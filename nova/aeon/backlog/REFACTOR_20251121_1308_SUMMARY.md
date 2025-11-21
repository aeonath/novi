# Remove setTimeout from Terminal

**Type**: REFACTOR  
**Date**: 2025-11-21  

## Summary
Removed all setTimeout calls from Terminal component for deterministic behavior.

## Changes
- ✅ Replaced 9 setTimeout calls with event-based approaches
- ✅ Used ResizeObserver for container sizing
- ✅ Used terminal.onRender() for initial fit
- ✅ Used write() callback for scroll after data
- ✅ More reliable and deterministic terminal behavior

## Files Modified
- src/renderer/components/Terminal.tsx

