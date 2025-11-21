# Simplify Terminal Implementation

**Type**: REFACTOR  
**Date**: 2025-11-21  

## Summary
Drastically simplified terminal to remove buggy PWD tracking and complex scroll logic.

## Changes
- ✅ Removed PWD tracking entirely
- ✅ Static tab name: "💻 Terminal"
- ✅ Simplified initialization with requestAnimationFrame
- ✅ No automatic scrolling
- ✅ Much simpler, more reliable code

## Files Modified
- src/main/main.ts
- src/renderer/components/App.tsx
- src/renderer/components/Terminal.tsx

