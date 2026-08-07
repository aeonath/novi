# Changelog — 2026-08-06 17:55

## Ad Hoc — Fix CliService EACCES/WSL error on Windows startup

### Summary
`CliService` was binding an AF_UNIX filesystem-path socket (`~/.novi/novi-editor.sock`) on
Windows. Windows' AF_UNIX emulation can fail to bind such paths with `EACCES`, and the OS
error text it surfaces in that failure case misleadingly references WSL ("The Windows
Subsystem for Linux is not installed..."), even though Novi has no dependency on WSL and
never invoked it. `CliService` now uses a native Windows named pipe (`\\.\pipe\novi-editor`)
on `win32`, which is the standard, always-available Windows IPC primitive and requires no
AF_UNIX/afunix.sys or WSL support. POSIX platforms are unchanged (still use the `.sock` file
path). Also fixed two pre-existing, unrelated test failures surfaced while getting to a
100% pass rate: a Windows-only `path.resolve()` assumption in a CLI-arg-parsing test, and a
missing `build/installer.nsh` packaging asset that the installer test suite checks for but
that `.gitignore` was silently excluding from version control.

### Files Changed

| File | Change |
|------|--------|
| `src/main/services/cli-service.ts` | `getPipePath()` returns a Windows named pipe path on `win32`; `start()`/`stop()` skip filesystem mkdir/exists/unlink for the pipe path (named pipes aren't files) |
| `src/tests/core-0.8.0/novi-command.test.ts` | `getPipePath` tests split by platform; `CliService.start` tests split by platform (mkdir/unlink only asserted on non-Windows, pipe listen asserted on Windows); fixed `passes through an absolute file arg unchanged` to normalize the expected path via `path.resolve()` instead of hardcoding a POSIX path |
| `README.md` | Documented the platform-specific IPC path (named pipe on Windows, Unix socket elsewhere) |
| `.gitignore` | Added `!build/installer.nsh` exception — the blanket `build/` ignore was also swallowing electron-builder's source packaging assets, not just build output |
| `build/installer.nsh` | New — NSIS `customInit`/`customUnInit` macros that `taskkill` any running `NoviEditor.exe` before install/uninstall, matching what `installer.test.ts` already asserted |

### Implementation Details
- Root cause: `net.Server.listen(path)` with a plain filesystem path on Windows goes through
  AF_UNIX emulation, which is fragile (ACLs, filesystem/provider config) and was failing
  with `EACCES` here. Named pipes (`\\.\pipe\<name>`) are handled natively by `net` on
  Windows and sidestep that code path entirely.
- WSL support elsewhere in Novi (the opt-in "WSL Bash" terminal shell type, gated by
  `checkWslAvailable()`) is unrelated and intentionally untouched — Novi still runs fully
  Windows-native with no WSL requirement.

### Test Results
- 659 tests passed, 0 failed (39 suites) — full `npm test` run, up from 656/659 before this fix
- `npm run build` (tsc + esbuild renderer + copy steps) completes cleanly

### Commit
TBD
