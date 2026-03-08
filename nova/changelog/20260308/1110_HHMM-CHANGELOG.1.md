# Changelog — 20260308.1110

## Ad hoc: Fix status bar shell label and hide cursor position on non-editor tabs

### Problem
1. Status bar displayed "git-bash Terminal" on Linux builds instead of "Linux Terminal"
2. Line/column position info (e.g. "Ln 5, Col 12 (42 lines)") remained visible when switching to terminal, image viewer, or settings tabs

### Fix
- **App.ts `shellTypeToLabel()`**: Fixed labels — `'linux'` → `'Linux'`, `'gitbash'` → `'Git Bash'`, default → `'Terminal'`. Changed default `shellLabel` from `'git-bash'` to `'Terminal'`.
- **main.ts**: Shell type default is now platform-aware — `'linux'` on non-Windows, `'gitbash'` on Windows. Applied to both startup and setting-change handler.
- **App.ts tab switching**: Added `removeItem('editor-position')` calls when switching to terminal, image, or settings tabs so cursor position info only shows for editor tabs.

### Files Changed
- `src/renderer/components/App.ts` — shell label mapping, default label, cursor position cleanup on tab switch
- `src/main/main.ts` — platform-aware shell type default

### Test Results
- 37 suites passed, 642 tests passed
- 2 pre-existing environment-specific failures (extension-loader, installer) unrelated to this change

### Commit Hash
TBD
