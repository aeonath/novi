# Changelog — 2026-03-05 23:02

## Show reload banner only on the changed file's tab

### Summary
The external file change reload banner now only appears when the user switches to the specific tab where the file was changed. Previously the banner was inserted into the shared editor area and was visible across all tabs.

### Implementation

#### `src/renderer/components/App.ts`
- Changed `pendingReloadBanners` from `Set<string>` to `Map<string, HTMLElement>` to track banner elements per file path
- Banner is created with `display: none` and inserted into `monacoContainerEl`
- `onTabSwitch()` shows/hides banners: only the banner matching the active file tab is visible
- Added `flex-direction: column` to `monacoContainerEl` so banner sits above the editor, not beside it
- Added `filePath` to `activeTab` for file tabs so banner visibility check works
- Banner is shown immediately if the changed file's tab is already active

### Files Changed
- **`src/renderer/components/App.ts`** — Per-tab banner visibility

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
