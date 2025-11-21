# Fix Terminal Scroll Behavior — 20251121.1320

## Summary
Fixed terminal scrolling to only happen once on initial render, preventing prompt truncation.

## Files Changed
- src/renderer/components/Terminal.tsx — Fixed onRender to only scroll once

## Changes Made
1. **Remove scroll on write**: Removed scrollToBottom from write() callback
2. **One-time scroll**: Added `hasRendered` flag to ensure onRender only executes once
3. **Prevent re-scrolling**: Stops terminal from scrolling on every data write

## Problem
Terminal was scrolling to bottom on every write operation, causing the prompt to be truncated when restoring from workspace. The "k" visible was the last character of "Work/" being cut off at the top.

## Solution
- onRender now only fires once using a local `hasRendered` flag
- Removed automatic scroll from write() callback
- Terminal position stays stable after initial render

## Reason
User reported restored terminal showing truncated prompt with just "k" visible.

## Git Commit Hash
`TBD` - Fix terminal scroll behavior

## Status
✅ Completed

