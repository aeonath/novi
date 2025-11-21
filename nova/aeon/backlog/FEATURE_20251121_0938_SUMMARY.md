# Feature Summary: Context-Aware File Menu

**Date**: 2025-11-21 09:38  
**Status**: ✅ Completed  
**Type**: Feature Enhancement  
**Platform**: All

## Feature
File menu now adapts based on active tab type - disables "Save"/"Save As" for terminal tabs and changes "Close File" to "Close Terminal".

## Implementation
- Menu rebuilds when active tab type changes
- IPC communication between renderer and main process
- "Save" commands grayed out for terminals
- Dynamic "Close File" vs "Close Terminal" label
- "Close Terminal" command actually closes terminal tab

## Files Modified
- `src/main/menu.ts` - Added context-aware menu logic
- `src/main/main.ts` - Added IPC handler for menu updates
- `src/preload/preload.ts` - Exposed updateMenuForTab API
- `src/types/global.d.ts` - Added type definitions
- `src/renderer/components/App.tsx` - Added menu update on tab change + close-terminal handler

## Tests
- All 574 tests passing ✅
- Manual testing required to verify menu changes

## Changelog
See: `nova/changelog/20251121/TIME_0938-CHANGELOG.md`

## Commit
`TBD` - Feature: Add context-aware File menu for terminal tabs

