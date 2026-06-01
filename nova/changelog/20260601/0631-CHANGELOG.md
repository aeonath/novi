# Changelog — 20260601.0631

## Ad hoc: Fix tab closing on save-as for new untitled files

### Files Changed
- `src/renderer/components/App.ts`

### Problem
When creating a new (untitled) file and saving it via Ctrl+S → Save As dialog, the tab would disappear after the save completed.

### Root Cause
Two bugs in the `onSaveFileAs` handler (`App.ts` ~line 1201):

1. **Race condition** — `tabBarAPI.removeTab(currentTab.id)` was not awaited. Because `removeTab` is async, `addTab` executed immediately before the removal completed. This created two tabs with the same ID. When `removeTab` later resumed, its `tabs.filter(t => t.id !== tabId)` deleted both the stale untitled tab and the newly added real-path tab.

2. **Spurious save prompt** — `onTabClose` saw `isDirty: true` on the untitled tab (never cleared before removal) and displayed "Do you want to save?" mid-save. User interaction with that prompt then triggered the actual tab removal, wiping the replacement tab.

### Fix
- Set `this.forceCloseTabId = currentTab.id` before `removeTab` to use the existing bypass mechanism in `onTabClose`, suppressing the save prompt.
- `await tabBarAPI.removeTab(currentTab.id)` to ensure the old tab is fully gone before `addTab` creates the replacement.
- Removed the now-redundant `updateTabDirty` call that followed `addTab` (the new tab is already created with `isDirty: false`).

### Test Results
- 654/654 tests passed (39 suites)

### Commit
TBD
