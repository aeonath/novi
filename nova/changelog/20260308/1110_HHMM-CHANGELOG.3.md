# Changelog — 20260308.1110

## Ad hoc: Fix "Terminal Terminal" status bar label and tab bar gaps

### Problem
1. Status bar showed "Terminal Terminal" because `shellLabel` defaulted to `'Terminal'` and the status text appended `" Terminal"` after it.
2. Tab bar had gaps at top, bottom, and left — tabs didn't fill the full height of the tab bar area.

### Fix
- **App.ts**: Changed `shellTypeToLabel()` to return full display labels (`'Linux Terminal'`, `'Git Bash'`, etc.). Removed redundant `" Terminal"` suffix from status bar format strings. Updated default `shellLabel` to `'Linux Terminal'`.
- **TabBar.ts**: Changed `alignItems` from `'center'` to `'stretch'` so tabs fill the full tab bar height. Changed `minHeight` to fixed `height: '35px'`. Removed vertical padding from individual tabs (`padding: 8px 12px` → `padding: 0 12px`), since the stretch handles vertical sizing.
- **index.html**: Reverted xterm CSS change (was not the issue).

### Files Changed
- `src/renderer/components/App.ts` — shell label mapping, status bar format strings
- `src/renderer/components/TabBar.ts` — tab bar and tab element styling
- `src/renderer/index.html` — reverted xterm CSS

### Test Results
- 37 suites passed, 642 tests passed
- 2 pre-existing environment-specific failures (extension-loader, installer) unrelated to this change

### Commit Hash
TBD
