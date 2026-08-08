# Changelog — 2026-08-08 06:51

## Ad hoc: Fix `novi.cmd` installed but never added to PATH (wrong registry scope)

### Summary
Follow-up to the 06:31 fix. The user reinstalled and confirmed `novi.cmd`
was now present in the install dir, but `novi` still wasn't found in Git
Bash. Checked the registry directly (`[Environment]::GetEnvironmentVariable`
for both `Machine` and `User` scope) — neither contained a `novi` entry, and
the shell wasn't elevated. Root cause: `customInstall` wrote the PATH update
to `HKLM`'s `Environment` key (`'Machine'` scope), but a real
`pack:win:installer` build logs `perMachine=false` — this installer runs
unelevated, so it has no rights to write `HKLM`. The `nsExec::Exec` call
doesn't check the PowerShell process's exit code, so the failure was
silent: `novi.cmd` (a plain file write, no special rights needed) succeeded
while the PATH update quietly no-opped.

### Files Changed

| File | Change |
|------|--------|
| `build/installer.nsh` | `customInstall`/`customUnInstall`: PATH scope changed from `'Machine'` (HKLM, requires admin) to `'User'` (HKCU, no elevation needed) — matches the installer's actual `perMachine=false` mode |
| `src/tests/core-0.7.0/installer.test.ts` | Updated assertion from `'Path','Machine'` to `'Path','User'` |

### Test Results
- 41 suites passed, 0 failed (687 tests)
- `npm run pack:win:installer` completed successfully (verified NSIS syntax compiles)

### Follow-up for the user
- Reinstall is required: uninstall the current build (`Uninstall NoviEditor.exe`
  in the install dir), rebuild (`npm run pack:win:installer`), install the
  new `Novi Setup 0.8.6.exe`.
- After reinstalling, `novi` will only resolve in **freshly launched**
  processes descended from Explorer (a brand-new Git Bash window, new
  terminal app, etc.) — .NET's `SetEnvironmentVariable` broadcasts
  `WM_SETTINGCHANGE`, which Explorer listens for and refreshes its cached
  environment block from, so new child processes get the update without a
  reboot or logoff.
- Terminal tabs opened **inside** a NoviEditor window that was already
  running before the reinstall will still have the old PATH baked into that
  process's environment block — fully quit and relaunch `NoviEditor.exe`
  itself (not just close/reopen a terminal tab within it) if testing from
  there.

### Commit
TBD
