# Changelog — 2026-03-05 22:52

## Fix "Ignore" button not working on external file change banner

### Summary
Clicking "Ignore" on the reload banner still showed the new file content because `onTabSwitch` was reading fresh content from disk when the tab was switched to show the banner. Now `onTabSwitch` skips the fresh-read when there's a pending reload banner for that file, letting the user's choice (Reload vs Ignore) actually take effect.

### Root Cause
`handleExternalFileChange()` calls `tabBarAPI.switchTab()` to focus the changed file's tab, which triggers `onTabSwitch()`. The fresh-read logic in `onTabSwitch` immediately loaded new content from disk before the user could interact with the banner.

### Implementation

#### `src/renderer/components/App.ts`
- Added check in `onTabSwitch`: skip fresh disk read if `pendingReloadBanners` contains the file path

### Files Changed
- **`src/renderer/components/App.ts`** — Skip auto-reload when reload banner is pending

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
