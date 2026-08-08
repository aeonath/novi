# Changelog — 2026-08-08 06:31

## Ad hoc: Fix `novi` CLI command missing on Windows installs

### Summary
The `novi` CLI wrapper never got installed on Windows. Sprint 8 Task 7
(`e4647b3`, 2026-04-28) was supposed to add `customInstall`/`customUnInstall`
NSIS macros to `build/installer.nsh` that write `novi.cmd` into the install
directory and register it on the system `PATH`, but its own changelog entry
noted the edit was made locally and never committed (a mistaken belief that
`build/` was fully gitignored — it isn't; `.gitignore` explicitly un-ignores
`build/installer.nsh`). The change was lost, leaving `installer.nsh` with
only the pre-existing `taskkill`-before-install macros. Every Windows
install since then shipped `NoviEditor.exe` with no `novi` entry point and
no `PATH` registration, so `novi <file>` failed with `command not found` in
any shell (cmd, PowerShell, Git Bash) even though the underlying
`--novi-cli` socket protocol (`src/main/cli-mode.ts`,
`src/main/services/cli-service.ts`) has worked since Sprint 8.

### Files Changed

| File | Change |
|------|--------|
| `build/installer.nsh` | Added `customInstall` (writes `$INSTDIR\novi.cmd`, adds `$INSTDIR` to the system `PATH` via a temp PowerShell script if not already present) and `customUnInstall` (removes `$INSTDIR` from the system `PATH`; `novi.cmd` itself is already gone by then — the uninstaller `RMDir /r`s `$INSTDIR` before `customUnInstall` runs) |
| `src/tests/core-0.7.0/installer.test.ts` | Added assertions that `installer.nsh` contains `customInstall`, `customUnInstall`, `novi.cmd`, `--novi-cli`, and the PowerShell `Machine`-scope PATH call |

### Implementation Details
- `novi.cmd` contents: `"%~dp0NoviEditor.exe" --novi-cli %*` — resolves the
  sibling `NoviEditor.exe` via `%~dp0` so it works regardless of install
  location.
- PATH update/removal is done by writing a small `.ps1` to `$TEMP` and
  running it via `powershell -NoProfile -ExecutionPolicy Bypass -File`
  (avoids NSIS inline-escaping of a one-liner). The script reads
  `[Environment]::GetEnvironmentVariable('Path','Machine')`, splits on `;`,
  filters out any entry matching `$INSTDIR` (trailing-backslash-normalized,
  case-insensitive), and re-adds it on install / omits it on uninstall.
  `.NET`'s machine-scope `SetEnvironmentVariable` broadcasts
  `WM_SETTINGCHANGE`, so newly opened shells pick up the change without a
  reboot — already-open shells (e.g. an existing Git Bash session) still
  need to be reopened.
- System-wide (not per-user) `PATH`, matching the original plan
  (`nova/trajectory-1.0.0/yield-0.8.x/NOVI_COMMAND_PLAN.md`) and the
  existing `nsis.allowElevation: true` config.
- Verified by running a full `npm run pack:win:installer` build — NSIS
  compiled `installer.nsh` with the new macros with no syntax errors and
  produced `dist/Novi Setup 0.8.6.exe`.

### Known Gap (not fixed here, flagged for follow-up)
`package.json`'s `deb.afterInstall`/`afterRemove` reference
`build/after-install.sh` / `build/after-remove.sh`, which do not exist
anywhere in the repo or its history — the Linux half of the same Step 7
work also appears to have never landed. Not touched in this change since
it's a separate platform/build target; a fresh `npm run pack:deb` would
likely fail until that's addressed.

### Test Results
- 41 suites passed, 0 failed (687 tests)
- `npm run pack:win:installer` completed successfully

### Commit
TBD
