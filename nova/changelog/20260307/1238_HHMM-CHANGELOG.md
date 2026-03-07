# Changelog — 2026-03-07 12:38

## Sprint8 Task2 (revision): Platform-aware terminal settings, WSL detection, inline path selector

### Problem
Terminal Settings UI only showed Windows shell options regardless of platform. Path selector
was rendered at the bottom instead of inline after the relevant radio. WSL was always shown
as available even when not installed. No Linux shell support.

### What Changed

#### Platform-Aware Shell Settings (`SettingsTab.ts`)
- Windows: 4 radio options (Git Bash, cmd, PowerShell, WSL) with inline path selector
- Linux: single "Linux Shell" option with "Use default ($SHELL)" checkbox and custom path input
- Path selector renders inline directly after the selected radio that needs it (not at bottom)
- WSL option disabled with "not available" warning when WSL is not installed
- Platform and WSL availability loaded async from main process before rendering
- `ShellType` expanded to include `'linux'`

#### New IPC Handlers (`main.ts`, `preload.ts`, `global.d.ts`)
- `get-platform`: returns `process.platform` to renderer
- `check-wsl-available`: checks `existsSync('C:\Windows\System32\wsl.exe')`
- Both exposed via `window.api.getPlatform()` and `window.api.checkWslAvailable()`

#### Linux Shell Support (`terminal-service.ts`)
- `ShellType` union now includes `'linux'`
- `resolveShellPath()` handles Linux: uses custom path if configured, falls back to $SHELL, then common paths
- `getShellArgs('linux')` returns `['--login', '-i']`
- `isBashLike` includes `'linux'` for PROMPT_COMMAND (OSC 7 CWD reporting)

### Files Changed
- `src/renderer/components/SettingsTab.ts` — platform-aware UI rewrite
- `src/main/services/terminal-service.ts` — Linux shell type support
- `src/main/main.ts` — get-platform, check-wsl-available IPC handlers
- `src/preload/preload.ts` — getPlatform, checkWslAvailable bridge
- `src/types/global.d.ts` — type declarations for new IPC methods
- `nova/trajectory-1.0.0/yield-0.8.x/SPRINT8_TASK2_SUMMARY.md` — updated

### Tests
- 646 passed, 0 failed (39 suites)

### Commit
`TBD`
