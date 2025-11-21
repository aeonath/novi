# Terminal Context Menu Icons and Prompt Fix — 20251121.1301

## Summary
Added icons to terminal context menu and fixed initial prompt cutoff on workspace load.

## Files Changed
- src/renderer/components/Terminal.tsx — Added icons and scroll-to-bottom on data write

## Changes Made
1. **Context Menu Icons**: Added emoji icons to terminal context menu
   - 📋 Copy
   - 📄 Paste
   - 💻 New Terminal

2. **Initial Prompt Fix**: Modified write() function in terminal API to scroll to bottom after writing data
   - Ensures prompt is visible when terminal loads from workspace
   - 50ms delay after write to allow rendering before scroll

## Reason
User requested icons for terminal context menu and reported that initial prompt was being cut off when loading terminal from saved workspace.

## Git Commit Hash
`TBD` - Terminal context menu icons and prompt fix

## Status
✅ Completed

