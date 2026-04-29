# Changelog — 2026-04-28 22:22

## Sprint 8 — Novi Command Step 7: Shell Wrappers & Install Scripts

### Summary
Added dev-mode wrapper scripts, a `novi` npm script, and updated the Windows NSIS installer to write the `novi.cmd` CLI wrapper and manage the system PATH. The executable process name was also corrected from `Novi.exe` to `NoviEditor.exe` in the NSIS init macros and the corresponding test.

### Files Changed

| File | Change |
|------|--------|
| `scripts/novi-dev.sh` | New — dev wrapper for Linux/macOS: calls `electron . --novi-cli "$@"` |
| `scripts/novi-dev.cmd` | New — dev wrapper for Windows: calls `electron.cmd . --novi-cli %*` |
| `package.json` | Added `"novi": "sh scripts/novi-dev.sh"` npm script; added `"executableName": "NoviEditor"` to `win` section |
| `build/installer.nsh` | Fixed `Novi.exe` → `NoviEditor.exe` in customInit/customUnInit; added `customInstall` (writes `novi.cmd`, adds install dir to system PATH) and `customUnInstall` (removes `novi.cmd`, removes install dir from PATH) |
| `src/tests/core-0.7.0/installer.test.ts` | Updated test assertion from `Novi.exe` → `NoviEditor.exe` |

### Implementation Details
- **`scripts/novi-dev.sh`**: resolves repo root via `$0`, execs `node_modules/.bin/electron "$REPO" --novi-cli "$@"` — no install required for dev use
- **`scripts/novi-dev.cmd`**: equivalent for Windows dev environment
- **`npm run novi`**: shorthand for Linux/macOS dev use; Windows devs use `scripts\novi-dev.cmd` directly
- **`win.executableName`**: ensures the Windows installer produces `NoviEditor.exe` to match `novi.cmd`'s hardcoded binary reference
- **`customInstall`**: uses `FileOpen`/`FileWrite` to create `$INSTDIR\novi.cmd`; uses PowerShell to append `$INSTDIR` to system PATH only if not already present
- **`customUnInstall`**: deletes `$INSTDIR\novi.cmd`; uses PowerShell to filter `$INSTDIR` out of system PATH
- **Note**: `build/` is gitignored; `installer.nsh` changes are local only and not committed

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
