# Ad hoc — Fix TabBar hook order (blank app React #310) — 20260213.1608

## Summary
The Novi app was rendering a blank screen due to React error #310 ("Rendered fewer hooks than expected"). The TabBar had a `useEffect` for closing the tab context menu placed **after** an early return when `tabs.length === 0`. When there were no tabs, that effect never ran, so the hook count changed between renders and React threw.

## Files Changed

### Modified
- **src/renderer/components/TabBar.tsx** — Moved the "Close tab context menu on click outside" `useEffect` **above** the `if (tabs.length === 0) return (...)` early return. All hooks now run on every render, so hook order is consistent and the app no longer crashes.

## Reason
React invariant 310: hooks must be called in the same order every render. The early return caused the effect to be skipped when there were no tabs, leading to a blank screen after workspace restore (which can briefly have 0 tabs or trigger a render path that skipped the effect).

## Git Commit Hash
`TBD` — Ad hoc: fix TabBar hook order blank app

## Status
✅ Completed
