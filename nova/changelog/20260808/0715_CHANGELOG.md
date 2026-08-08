# Changelog — 2026-08-08 07:15

## Ad hoc: Add extensionless bash wrapper so `novi` resolves in git-bash

### Summary
Second follow-up to the 06:31/06:51 fixes. Both prior fixes addressed real
bugs (missing `novi.cmd`, wrong PATH registry scope) but the underlying
design was still wrong for git-bash: `novi.cmd` is only resolvable by
`cmd.exe`/PowerShell's `PATHEXT` bare-name lookup. `bash.exe` (Git for
Windows) does its own POSIX-style PATH search — it looks for a file with
the exact name `novi`, no extension, and reads the shebang line itself.
`.cmd` was never going to be visible to it, confirmed by user testing
(`bash: novi: command not found` even with the file present and PATH
correctly registered).

Fix: `customInstall` now writes a second file, `$INSTDIR\novi` (no
extension, `#!/bin/bash` shebang), alongside the existing `novi.cmd`. Same
pattern as the Linux wrapper (`#!/bin/sh` + `exec NoviEditor --novi-cli
"$@"`) — the only differences are `NoviEditor.exe` (Windows binary
extension) and resolving the binary's location via `$(dirname "$0")` at
runtime instead of a hardcoded `/opt/Novi/` path, since this installer
allows the user to pick the install directory
(`allowToChangeInstallationDirectory: true`) unlike the fixed Linux path.
Each shell's own bare-name resolution rule picks the matching file with no
detection logic needed: `cmd.exe`/PowerShell skip extensionless files by
`PATHEXT` rules and find `novi.cmd`; `bash.exe` finds `novi` directly.

Caught one real NSIS bug before it reached a build: the bash script's `$@`
and `$0` (and `$(...)`) were initially written as literal NSIS `FileWrite`
text, which NSIS itself interprets as *its own* variable syntax (`$` always
triggers NSIS substitution regardless of quoting) — `makensis` failed with
`warning 6000: unknown variable/constant "@"`. Fixed by escaping every
literal `$` destined for the output file as `$$`. Also used LF-only line
endings (`$\n`, not `$\r$\n`) for this file — a stray `\r` on the shebang
line makes the kernel look for an interpreter literally named `bash\r` and
fail.

Verified end-to-end by the user: reinstalled, opened a fresh git-bash
window, `novi <file>` now works.

### Files Changed

| File | Change |
|------|--------|
| `build/installer.nsh` | `customInstall` writes `$INSTDIR\novi` (extensionless, `#!/bin/bash`, `exec "$(dirname "$0")/NoviEditor.exe" --novi-cli "$@"`) in addition to `novi.cmd` |
| `src/tests/core-0.7.0/installer.test.ts` | Added assertions for the extensionless wrapper: presence of `$INSTDIR\novi`, `#!/bin/bash`, `dirname` |

### Test Results
- 41 suites passed, 0 failed (688 tests)
- `npm run pack:win:installer` completed successfully
- User-confirmed working in a real git-bash session after reinstall

### Commit
TBD
