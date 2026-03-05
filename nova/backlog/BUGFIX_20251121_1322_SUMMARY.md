# Strip ANSI Codes from PWD

**Type**: BUGFIX  
**Date**: 2025-11-21  

## Summary
Fixed PWD parsing to strip ANSI color codes, showing directory name instead of control codes.

## Changes
- ✅ Strip ANSI escape codes before parsing
- ✅ Regex pattern improved to stop at prompt character
- ✅ Tab now shows directory name correctly

## Files Modified
- src/main/main.ts

