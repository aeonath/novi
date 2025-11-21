# Bugfix Summary: Terminal First Line Truncation

**Date**: 2025-11-21 08:37  
**Status**: ✅ Completed  
**Severity**: Medium-High  
**Platform**: All

## Issue
Terminal first line was being cut off with 2+ characters lost when switching between tabs.

## Root Causes
1. Insufficient scrollback buffer (1000 lines)
2. Scroll position not preserved during tab switch resize
3. No container padding causing visual truncation at top edge

## Solution
- Increased scrollback from 1000 to 10000 lines
- Added scroll position preservation during resize - only scrolls to bottom if already there
- Added 4px padding to terminal container

## Files Modified
- `src/renderer/components/Terminal.tsx`

## Tests
- All 574 tests passing ✅
- Manual testing confirms full first line display and no character loss

## Changelog
See: `nova/changelog/20251121/TIME_0837-CHANGELOG.md`

## Commit
`TBD` - Bugfix: Fix terminal first line truncation

