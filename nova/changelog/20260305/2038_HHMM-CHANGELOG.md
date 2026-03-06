# Changelog — 2026-03-05 20:38

## Add loading spinner to file tree during terminal initialization

### Summary
On startup, the file tree would briefly flash the previous session's directory before the terminal reported its actual CWD. Now the file tree shows an animated "Loading..." spinner until the terminal's initial CWD arrives, preventing the stale tree flash.

### Implementation
- Added `_loading` state to `FileTree` with a public setter that triggers re-render
- `renderContent()` checks `_loading` first — when true, shows a CSS-animated spinner and "Loading..." text instead of tree content or empty state
- Spinner uses a `@keyframes novi-spin` animation injected once into `<head>`
- `App.ts` sets `fileTree.loading = true` immediately after creating the FileTree
- Loading is cleared (`fileTree.loading = false`) when:
  - `terminalOnInitialCwd` fires (terminal reports its starting directory)
  - `terminalOnPwd` fires (terminal reports CWD change via OSC 7)
  - `singlefiletree` setting is on (tree is user-driven, not terminal-driven)

### Files Changed
- **`src/renderer/components/FileTree.ts`** — Added `_loading` property, `loading` setter, and loading spinner rendering in `renderContent()`
- **`src/renderer/components/App.ts`** — Set `fileTree.loading = true` on mount; clear it in `terminalOnInitialCwd`, `terminalOnPwd`, and `loadSettings` (when singlefiletree is on)

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
