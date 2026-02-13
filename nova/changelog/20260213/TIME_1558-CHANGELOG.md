# Ad hoc — Right-click context menu on Novi Shell tab — 20260213.1558

## Summary
Right-clicking the Novi Shell **tab** (the tab in the tab bar) now opens a context menu with Copy, Paste, separator, and Close. Previously only the Novi Shell content area had a context menu; the tab itself did nothing on right-click.

## Files Changed

### Modified
- **src/renderer/components/TabBar.tsx** — Added state `tabContextMenu: { x, y, tab } | null`. Each `TabItem` has `onContextMenu` that prevents default, dispatches `novi-close-context-menus`, and sets `tabContextMenu`. When `tabContextMenu` is set and the tab is `novi-prompt`, render a fixed-position menu with Copy (calls `__noviShellCopy`), Paste (`__noviShellPaste`), separator, Close (calls `removeTab(tab.id)`). Close menu on document click or `novi-close-context-menus`. Added styles `tabContextMenuItem` and `tabContextMenuSeparator`.
- **src/renderer/components/NoviShell.tsx** — When `isActive`, register `(window as any).__noviShellCopy` and `__noviShellPaste` so the TabBar menu can invoke Copy/Paste on the active Novi Shell. Use refs so the registered callbacks always call the latest handlers. Wrapped `handleCopy` and `handlePaste` in `useCallback` and assigned to refs. Added `useCallback` import.

## Reason
User reported that right-clicking on the Novi Shell tab does nothing. The context menu (Copy, Paste, Close) existed only on the shell content area; the tab bar did not handle context menu on tabs. Now the tab itself shows the same options when right-clicked.

## Git Commit Hash
`TBD` — Ad hoc: Novi Shell tab right-click context menu

## Status
✅ Completed
