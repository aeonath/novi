# Bug Fix — 20251109.1038

## Summary
Fixed two critical UI bugs:
1. Reverted unintended pure black background in FileTree and GitPanel (should be original gray #252526)
2. Implemented home screen display on startup - restored tabs are visible but not active until clicked

Also fixed failing unit test in `actions.test.ts` that expected 7 actions but received 8 (git-refresh action was added previously).

## Files Changed

### Source Files Modified
- `src/renderer/components/FileTree.tsx` — Reverted background colors from pure black (#000000) back to original gray (#252526)
  - Updated `container` backgroundColor from `#000000` to `#252526`
  - Updated `header` backgroundColor from `#000000` to `#252526` and border from `#1a1a1a` to `#3e3e42`
  - Updated `footer` backgroundColor from `#000000` to `#252526` and border from `#1a1a1a` to `#3e3e42`
  - Updated `contextMenu` backgroundColor from `#0a0a0a` to `#2d2d30` with proper borders
  - Updated hover states from `#1a1a1a` to `#2a2d2e`
  - Updated input backgrounds from `#0a0a0a` and `#1a1a1a` to `#1e1e1e` and `#2a2d2e`

- `src/renderer/components/GitPanel.tsx` — Reverted background colors from pure black back to original gray
  - Updated `container` backgroundColor from `#000000` to `#252526`
  - Updated `header` backgroundColor from `#000000` to `#252526` and border from `#1a1a1a` to `#3e3e42`
  - Updated `commitSection` border from `#1a1a1a` to `#3e3e42`
  - Updated `commitInput` backgroundColor from `#0a0a0a` to `#1e1e1e` with proper border
  - Updated `credentialInput` backgroundColor from `#0a0a0a` to `#1e1e1e`
  - Updated hover states from `#1a1a1a` to `#2a2d2e`

- `src/renderer/components/App.tsx` — Implemented home screen on startup behavior
  - Modified workspace restoration logic to NOT auto-activate first tab
  - Added `setShowWelcome(true)` and `setActiveTab(null)` after tab restoration
  - Removed Monaco file loading during restoration (only loads when tab is clicked)
  - Added `setShowWelcome(false)` to `onTabSwitch` handler to hide home screen when user clicks a tab
  - Comments updated to clarify that tabs are restored but not displayed until user clicks them

### Test Files Modified
- `src/tests/core-0.2.0/actions.test.ts` — Fixed failing test expectations
  - Updated test to expect 8 actions instead of 7 (git-refresh action was added)
  - Added assertion for the git-refresh action ID and label
  - Fixed both test cases that were checking action count

### Configuration Updated
- `nova/ai/CLAUDE_CONFIG.md` — Added critical test requirement reminder
  - Added new section: **🚨 TEST AFTER EVERY CHANGE 🚨**
  - Emphasizes running `npm test` after EVERY bug fix, feature, or code change
  - Clarifies this applies to ALL changes, not just sprint tasks
  - Reinforces that unit tests maintain velocity and reduce technical debt

## Technical Details

### Background Color Issue
The previous change attempted to match "art gallery" aesthetic with pure black backgrounds, but this was inconsistent with the rest of the Nova IDE UI which uses a charcoal gray (#252526). All UI panels should maintain the same gray color scheme for visual consistency.

### Home Screen Behavior
Previously, workspace restoration would auto-activate the first tab and load it into Monaco immediately. The new behavior:
1. Tabs are restored to the tab bar (visible but inactive)
2. Home screen remains displayed in the editor pane
3. `activeTab` state is set to `null`
4. When user clicks any tab, `onTabSwitch` is called which:
   - Hides the welcome screen
   - Sets the clicked tab as active
   - Loads the file content into Monaco

This gives users a clean starting point while preserving their workspace context.

### Test Fix
The `actions.test.ts` file was failing because a previous change added the `git-refresh` action to the default actions list, but the test was still expecting only 7 actions. Updated both test cases to expect 8 actions and added proper assertions for the git-refresh action.

## Test Results
All unit tests passing: **404 tests passed, 20 test suites passed**

```
Test Suites: 20 passed, 20 total
Tests:       404 passed, 404 total
Snapshots:   0 total
Time:        39.682 s
```

## Reason
User reported two issues during testing:
1. File tree pane was "jet black" instead of the proper gray matching the rest of the app
2. On startup with restored workspace, the first file would auto-open instead of showing the home screen

Both issues negatively impacted the user experience and needed immediate resolution. Additionally, the failing unit test needed to be fixed to maintain 100% test pass rate.

## Git Commit Hash
`TBD` - Bug Fix: Revert black backgrounds and implement home screen on startup

## Status
✅ Completed
- All background colors reverted to proper gray (#252526)
- Home screen displays on startup with restored tabs visible but inactive
- Clicking any tab hides home screen and activates the editor
- All 404 unit tests passing (100% pass rate)
- CLAUDE_CONFIG.md updated with test-after-every-change requirement

