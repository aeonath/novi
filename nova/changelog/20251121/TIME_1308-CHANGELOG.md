# Remove setTimeout from Terminal — 20251121.1308

## Summary
Removed all setTimeout calls from Terminal component and replaced with proper event-based approaches.

## Files Changed
- src/renderer/components/Terminal.tsx — Refactored to remove all timeouts

## Changes Made
Replaced all 9 setTimeout calls with proper event-driven approaches:

1. **Container sizing wait**: Changed from `setTimeout(200ms)` to `ResizeObserver` waiting for non-zero dimensions
2. **Xterm render waits**: Changed from `setTimeout(150ms, 50ms, 50ms)` to `requestAnimationFrame` only
3. **Initial fit**: Changed from `setTimeout(100ms)` to `terminal.onRender()` event
4. **Initial scroll**: Moved into `onRender()` event, no timeout
5. **Resize debounce**: Changed from `setTimeout(100ms)` to `ResizeObserver` 
6. **Write scroll**: Changed from `setTimeout(50ms)` to xterm's `write()` callback

## Benefits
- More reliable and deterministic behavior
- No race conditions from arbitrary timeout delays
- Responds to actual events rather than guessing timing
- Terminal prompt always visible immediately

## Reason
User correctly pointed out that timeouts are unreliable and requested deterministic event-based code.

## Git Commit Hash
`TBD` - Remove setTimeout from Terminal

## Status
✅ Completed

