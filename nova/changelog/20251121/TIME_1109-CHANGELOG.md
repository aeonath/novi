# Terminal Content Persistence — 20251121.1109

## Summary
Fixed terminal losing all content when navigating away and back to the tab.

## Files Changed
- src/renderer/components/Terminal.tsx — Fixed useEffect dependencies

## Changes Made
The terminal was being recreated every time the tab became active because `isActive` was in the useEffect dependency array. This caused the terminal to:
1. Dispose of the old xterm instance
2. Create a brand new instance
3. Lose all buffer content and history

**Fix**: 
- Added check `|| terminalRef.current` to prevent recreation if terminal already exists
- Removed `isActive` from the useEffect dependency array
- Terminal now persists across tab switches

## Reason
Critical bug where users lost all terminal history and output when switching tabs.

## Git Commit Hash
`TBD` - Terminal persistence fix

## Status
✅ Completed

