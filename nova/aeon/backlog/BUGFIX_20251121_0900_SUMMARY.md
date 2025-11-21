# Bugfix Summary: Terminal Character Clipping (Second Fix)

**Date**: 2025-11-21 09:00  
**Status**: ✅ Completed  
**Severity**: High  
**Platform**: All

## Issue
First 2 characters still being cut off from terminal output ("ONNET" instead of "SONNET").

## Root Cause
Previous fix used CSS padding on container div, causing dimension mismatch:
- Temp terminal measured without padding
- PTY created with too many columns
- Real terminal rendered with padding
- Characters clipped outside visible area

## Solution
Use xterm's built-in `padding` configuration instead of CSS:
- Added padding to both temp and real terminal configs
- Removed container div padding
- Ensures PTY dimensions match actual viewport

## Files Modified
- `src/renderer/components/Terminal.tsx`

## Tests
- All 574 tests passing ✅
- Build successful ✅

## Changelog
See: `nova/changelog/20251121/TIME_0900-CHANGELOG.md`

## Commit
`TBD` - Bugfix: Fix terminal character clipping with proper xterm padding

