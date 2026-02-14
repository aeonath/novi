# Ad hoc — :q / Ctrl+W returns to previous active tab — 20260213.2125

## Summary
When you close the current editor tab with :q (or :q!) or Ctrl+W (Close), the app now switches back to the tab that was active before the one you closed, instead of the default index-based neighbor. A "previous active tab" is remembered on every tab switch and passed to TabBar as the preferred next tab when closing the active tab.

## Reason
User requested: when you :q or Ctrl+W from the editor tab it should take you back to the most recent active tab.

## Files Changed

### Created
- **nova/changelog/20260213/TIME_2125-CHANGELOG.md** — This file.

### Modified
- **src/renderer/components/App.tsx**
  - Added `previousActiveTabIdRef` to hold the tab id we're leaving when we switch.
  - At the start of `onTabSwitch`, set `previousActiveTabIdRef.current = activeTab?.id ?? null`.
  - Pass `getPreferredNextTabId={() => previousActiveTabIdRef.current ?? null}` to TabBar.
- **src/renderer/components/TabBar.tsx**
  - New prop `getPreferredNextTabId?: () => string | null`.
  - In `removeTab`, when closing the active tab and there are remaining tabs: if `getPreferredNextTabId()` returns an id that exists in the remaining tabs, use that tab as the new active tab; otherwise keep the existing index-based choice (`Math.min(tabIndex, newTabs.length - 1)`).

## Implementation details
- Tab switch order: user had A active, switched to B (editor). So `previousActiveTabIdRef = A`. Closing B (via :q or Close) calls `removeTab(B)`. TabBar calls `getPreferredNextTabId()` → A; if A is still in the list, activate A and call `onTabSwitch(A)`.

## User-facing impact
- :q, :q!, and Ctrl+W / Close on the editor tab now return focus to the tab you were on before (e.g. terminal or Novi Shell) instead of the next tab by index.

## Git Commit Hash
`TBD` — Ad hoc: :q / Ctrl+W return to previous tab

## Status
✅ Completed
