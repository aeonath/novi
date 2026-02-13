# Ad hoc — Novi Shell tab context menu: Copy, Paste, sep, Close — 20260213.1555

## Summary
The Novi Shell tab right-click context menu is now: Copy, Paste, a separator, and Close. The Close option closes the Novi Shell tab. Removed the previous "New Terminal" and "Clear Screen" items from this menu per request.

## Files Changed

### Modified
- **src/renderer/components/NoviShell.tsx** — Added optional prop `onClose?: () => void`. Context menu now shows only: Copy, Paste, separator, Close. Close handler calls `onClose?.()` then closes the menu. Removed menu items "New Terminal" and "Clear Screen" from the context menu (Copy/Paste/Close only).
- **src/renderer/components/App.tsx** — When rendering each NoviShell, pass `onClose` that calls `__tabBarAPI.closeTab(tab.id)` so the Close menu item closes that Novi Shell tab (TabBar and existing onTabClose handle removal from state).

## Reason
User requested a right-click context menu on the Novi Shell tab with copy and paste options, then a separator, then a close option.

## Git Commit Hash
`TBD` — Ad hoc: Novi Shell tab context menu Copy Paste Close

## Status
✅ Completed
