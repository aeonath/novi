# Simplified File Dialog Filter

**Date**: 2025-11-09 14:14  
**Sprint**: 5  
**Version**: 0.5.0

## Changes

### Open File Dialog

- Removed "Text Files" filter from Open File dialog
- Now shows all files by default without extension filtering
- Simplifies user experience by removing unnecessary filter options

## Technical Details

**File**: `src/main/main.ts`
- Removed `filters` array from `dialog.showOpenDialog` options
- Dialog now uses default behavior showing all files

## Testing

- All 427 unit tests passing
- Build successful
- Open File dialog now shows all files without filtering

## Rationale

The "Text Files" filter was redundant when "All Files" is available. Since we want users to be able to open any file type in Nova, having a single "all files" default simplifies the UI and reduces potential confusion about which filter to use.

