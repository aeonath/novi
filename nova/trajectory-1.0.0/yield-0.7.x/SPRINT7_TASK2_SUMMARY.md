# Sprint 7 — Task 2 Summary: Permanent Home Terminal Tab

## Objective
Add a permanent Home terminal tab that is always first, always open, and cannot be closed — establishing Novi as a terminal-first environment.

## Checklist
- [x] Home terminal created on startup (always position 0)
- [x] Home terminal has home icon (🏠) and no close button
- [x] Home terminal cannot be closed via any path (TabBar, exit handler, onTabClose)
- [x] Home button in StatusBar navigates to Home terminal (not welcome screen)
- [x] File tree follows Home terminal CWD on startup
- [x] Home terminal starts in user's home directory
- [x] Home terminal excluded from workspace save (auto-created on next startup)
- [x] Welcome screen kept in code but no longer shown on startup
- [x] All 605 tests pass
- [x] Build compiles without errors

## Files Changed
1. `src/renderer/components/App.tsx` — Home terminal lifecycle, home button, exit handling
2. `src/renderer/components/TabBar.tsx` — Pinned tab support (no close button, no removal)
3. `src/renderer/components/StatusBar.tsx` — Home button tooltip update
4. `src/main/services/terminal-service.ts` — Default CWD to user home directory

## Test Results
- 32 test suites, 605 tests — all passing
