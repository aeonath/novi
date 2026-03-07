# Sprint 8 — Task 2 Summary: Terminal Settings UI and .novirc

**Date:** 2026-03-07
**Branch:** dev-core

## Objectives
- Build Terminal Settings UI with shell selection (4 options)
- Remove hardcoded Git Bash path, make shell configurable via settings
- Changing shell restarts home terminal only
- Implement ~/.novirc support (overrides settings.json)

## Checklist
- [x] Create `ShellType` union and `DEFAULT_GITBASH_PATH` in terminal-service
- [x] Implement `setShell()`, `resolveShellPath()`, shell-aware args in terminal-service
- [x] Set `PROMPT_COMMAND` only for bash-like shells (gitbash, wsl)
- [x] Remove old hardcoded `getShellPath()` method
- [x] Add `terminal-restart` IPC handler in main.ts
- [x] Add `browse-for-executable` IPC handler in main.ts
- [x] Load shell settings at startup, sync on set-setting
- [x] Add `terminalRestart` and `browseForExecutable` to preload and global.d.ts
- [x] Build Terminal Settings UI with 4 radio options in SettingsTab
- [x] Add Git Bash path selector with Browse button
- [x] Shell change saves setting and restarts home terminal
- [x] Suppress app quit during deliberate terminal restart
- [x] Add `resetTerminal()` to Terminal component
- [x] Create `novirc.ts` module with `loadNoviRc()` and `getNoviRcSetting()`
- [x] Integrate .novirc overrides in `getSetting()`
- [x] Update terminal-service tests for new shell system
- [x] Write novirc tests (9 tests)
- [x] Write terminal-shell tests (2 tests)
- [x] Update settings-tab tests for terminal settings UI
- [x] All tests pass (646 passed, 0 failed)
- [x] Build compiles successfully

## Files Changed
| File | Action |
|------|--------|
| `src/renderer/components/SettingsTab.ts` | Modified |
| `src/main/services/terminal-service.ts` | Modified |
| `src/main/main.ts` | Modified |
| `src/main/settings.ts` | Modified |
| `src/main/novirc.ts` | Created |
| `src/preload/preload.ts` | Modified |
| `src/types/global.d.ts` | Modified |
| `src/renderer/components/App.ts` | Modified |
| `src/renderer/components/Terminal.ts` | Modified |
| `src/tests/core-0.8.0/novirc.test.ts` | Created |
| `src/tests/core-0.8.0/terminal-shell.test.ts` | Created |
| `src/tests/core-0.8.0/settings-tab.test.ts` | Modified |
| `src/tests/core-0.4.0/terminal-service.test.ts` | Modified |

## Tests
- 39 suites, 646 tests passed, 0 failed
