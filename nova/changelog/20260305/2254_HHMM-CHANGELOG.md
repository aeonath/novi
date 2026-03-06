# Changelog — 2026-03-05 22:54

## Fix external file change banner placement and behavior

### Summary
Three fixes to the external file change notification:
1. No longer auto-switches to the changed file's tab — banner appears without interrupting current work
2. Banner now displays on top of the editor area (full width, between tab bar and content) instead of inside the monaco container where flex-direction:row caused it to appear beside the editor
3. Duplicate banners already prevented by `pendingReloadBanners` set — repeated changes keep the original banner

### Root Cause
- Auto-switching tabs was disruptive to the user's workflow
- `monacoContainerEl` uses `display: flex` without `flex-direction: column`, so prepending the banner there placed it horizontally beside the editor instead of above it

### Implementation

#### `src/renderer/components/App.ts`
- Removed `tabBarAPI.switchTab()` call from `handleExternalFileChange()`
- Changed banner insertion from `monacoContainerEl.prepend()` to `editorAreaEl.insertBefore()` after the tab bar

### Files Changed
- **`src/renderer/components/App.ts`** — Banner placement and no auto-switch

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
