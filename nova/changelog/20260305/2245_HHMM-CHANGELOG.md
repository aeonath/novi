# Changelog — 2026-03-05 22:45

## Read fresh file content from disk when switching to editor tabs

### Summary
When switching to a file tab, the editor now reads fresh content from disk instead of using cached tab content. Previously, if a file was modified externally and the user closed and reopened the tab (or switched away and back), the editor showed stale content from the in-memory cache.

### Root Cause
`onTabSwitch()` called `loadFile(tab.filePath, tab.content)` which loaded from the TabBar's cached `tab.content`. This cache was never updated when external changes occurred unless the user explicitly clicked "Reload" on the banner.

### Implementation

#### `src/renderer/components/App.ts`
- Changed `onTabSwitch()` for file tabs: when the file is not dirty, reads fresh content from disk via `window.api.readFile()` before loading into Monaco
- Updates the tab's cached content after successful disk read
- Falls back to cached content if the disk read fails (e.g., file deleted)
- Dirty files still use cached content to preserve unsaved edits

### Files Changed
- **`src/renderer/components/App.ts`** — Read from disk on tab switch for non-dirty files

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
