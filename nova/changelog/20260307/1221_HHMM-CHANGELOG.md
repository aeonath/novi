# Changelog — 2026-03-07 12:21

## Sprint8 Task2: Terminal settings UI, configurable shell, and .novirc support

### Problem
The terminal shell (Git Bash) was hardcoded in `terminal-service.ts` with no way to change
it from the UI. The settings tab had placeholder content for all sections. There was no
support for `~/.novirc` configuration overrides.

### What Changed

#### Terminal Settings UI (`SettingsTab.ts`)
- Terminal section now renders actual settings instead of placeholder
- Four shell options with radio-button selection: Git Bash, Command Prompt, PowerShell, WSL Bash
- Git Bash option includes a path selector with text input and Browse button
- Selecting a different shell saves the setting and restarts the home terminal
- Editor and Novi sections still show "Settings coming." placeholder

#### Configurable Shell (`terminal-service.ts`)
- Introduced `ShellType` union: `'gitbash' | 'cmd' | 'powershell' | 'wsl'`
- Exported `DEFAULT_GITBASH_PATH` constant (`C:\Program Files\Git\bin\bash.exe`)
- `setShell(type, path?)` configures the shell for new terminals
- `resolveShellPath()` resolves executable path from shell type with fallbacks
- Shell args are type-aware: `--login -i` for bash, `-NoLogo` for PowerShell, none for cmd/wsl
- `PROMPT_COMMAND` (OSC 7 CWD reporting) only set for bash-like shells
- Removed old hardcoded `getShellPath()` method

#### Shell Setting Persistence (`main.ts`)
- Shell type and path loaded from settings on startup
- `set-setting` IPC handler syncs shell changes to `terminalService`
- New IPC: `terminal-restart` — kills and recreates a terminal session with current shell config
- New IPC: `browse-for-executable` — native file dialog filtered to `.exe` files

#### Home Terminal Restart
- Changing shell restarts the home terminal only (not other terminal tabs)
- `App.ts` terminal-exit handler suppressed during deliberate restart via
  `window.__restartingTerminalId` flag
- Terminal component gains `resetTerminal()` method to clear xterm buffer on restart

#### `.novirc` Support (`novirc.ts`)
- New module reads `~/.novirc` on each `getSetting()` call
- Format: `KEY=VALUE` (one per line), `#` comments, blank lines ignored
- Parses booleans (`true`/`false`), numbers, and strings
- `.novirc` values override `settings.json` — user config does NOT write to `.novirc`
- Supported keys: shellType, shellPath, vimode, compat, singlefiletree, debug,
  keeptabs, gitenabled, fontSize, terminalFontSize, theme

### Files Changed
- `src/renderer/components/SettingsTab.ts` — terminal settings UI with shell selection
- `src/main/services/terminal-service.ts` — configurable shell, ShellType, resolveShellPath
- `src/main/main.ts` — shell setting load, set-setting sync, terminal-restart/browse-for-executable IPC
- `src/main/settings.ts` — getSetting now checks .novirc overrides first
- `src/main/novirc.ts` — new: ~/.novirc parser
- `src/preload/preload.ts` — terminalRestart, browseForExecutable
- `src/types/global.d.ts` — type declarations for new IPC methods
- `src/renderer/components/App.ts` — terminal restart suppression in exit handler
- `src/renderer/components/Terminal.ts` — resetTerminal() method
- `src/tests/core-0.8.0/novirc.test.ts` — new (9 tests)
- `src/tests/core-0.8.0/terminal-shell.test.ts` — new (2 tests)
- `src/tests/core-0.8.0/settings-tab.test.ts` — updated for terminal settings
- `src/tests/core-0.4.0/terminal-service.test.ts` — updated for new shell system

### Tests
- 646 passed, 0 failed (39 suites)

### Commit
`TBD`
