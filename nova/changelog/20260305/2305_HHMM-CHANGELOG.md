# Changelog — 2026-03-05 23:05

## Remove automatic fresh-read from disk on tab switch

### Summary
Removed the automatic fresh-read-from-disk in `onTabSwitch` that was overwriting the editor buffer even when the user clicked "Ignore" on the reload banner. The editor now only loads from `tab.content` (the cached buffer) when switching tabs. Fresh content from disk is only loaded via the "Reload" button on the banner, or when initially opening a file (via `addTab` which reads from disk).

### Root Cause
The fresh-read logic in `onTabSwitch` was bypassing the user's "Ignore" decision by reloading content from disk on every tab switch. Even with the `pendingReloadBanners` guard, the `getOrCreateModel` change (which now calls `setValue` when content differs) caused the model to be updated with whatever content was passed in.

### Implementation

#### `src/renderer/components/App.ts`
- Removed the fresh-read-from-disk block in `onTabSwitch` for file tabs
- `onTabSwitch` now simply calls `loadFile(tab.filePath, tab.content)` using cached content
- Disk reads only happen via the Reload button or when a file is first opened

### Files Changed
- **`src/renderer/components/App.ts`** — Remove auto fresh-read on tab switch

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
