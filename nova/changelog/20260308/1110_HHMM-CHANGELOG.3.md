# Changelog — 20260308.1110

## Ad hoc: Fix "Terminal Terminal" status bar label and terminal container gap

### Problem
1. Status bar showed "Terminal Terminal" because `shellLabel` defaulted to `'Terminal'` and the status text appended `" Terminal"` after it.
2. Home terminal had visible gap at top and left — xterm.js `.xterm` element didn't fill the container.

### Fix
- **App.ts**: Changed `shellTypeToLabel()` to return full display labels including "Terminal" where appropriate (`'Linux Terminal'`, `'Git Bash'`, etc.). Removed redundant `" Terminal"` suffix from status bar format strings. Updated default `shellLabel` to `'Linux Terminal'`.
- **index.html**: Added CSS rule for `.xterm` with `width: 100%; height: 100%; padding: 0; margin: 0;` to eliminate gap.

### Files Changed
- `src/renderer/components/App.ts` — shell label mapping, status bar format strings
- `src/renderer/index.html` — xterm CSS to fill container

### Test Results
- 37 suites passed, 642 tests passed
- 2 pre-existing environment-specific failures (extension-loader, installer) unrelated to this change

### Commit Hash
TBD
