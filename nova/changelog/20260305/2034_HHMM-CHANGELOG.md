# Changelog — 2026-03-05 20:34

## Fix: Open Folder button showing when singlefiletree is off

### Summary
The "Open Folder" button in the file tree header and empty state was always visible regardless of the `singlefiletree` setting. It should only appear when `singlefiletree` is on (since in multi-tree mode, the file tree CWD is driven by the active terminal tab, not manual folder selection).

### Root Cause
`App.ts` passed `showOpenFolder: true` hardcoded when creating the FileTree component. This was a regression from the React-to-vanilla conversion — the original React code conditionally passed the prop based on the singlefiletree setting.

### Fix
- Set `showOpenFolder: this.singleFileTree` in the FileTree constructor config (defaults to `false` since `singleFileTree` starts as `false`)
- Added `FileTree.setShowOpenFolder()` public method that updates the config and re-renders
- Call `setShowOpenFolder()` in `loadSettings()` after reading the persisted setting
- Call `setShowOpenFolder()` in the `novi-singlefiletree-changed` event handler when the user toggles the setting at runtime

### Files Changed
- **`src/renderer/components/FileTree.ts`** — Added `setShowOpenFolder(show: boolean)` public method
- **`src/renderer/components/App.ts`** — Changed `showOpenFolder: true` to `showOpenFolder: this.singleFileTree`; added `setShowOpenFolder()` calls in `loadSettings()` and singlefiletree change handler

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
