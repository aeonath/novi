# Changelog — 2026-04-28 21:55

## Sprint 8 — Novi Command Step 1: Rename Executable to NoviEditor

### Summary
Renamed the Electron binary from `novi` to `NoviEditor` inside the `/opt/Novi/` install directory. The install directory name (`Novi`) and app product name remain unchanged. Introduced a `novi` shell script wrapper at `/opt/Novi/novi` that invokes `NoviEditor --novi-cli "$@"` — this is the user-facing CLI entry point.

### Files Changed

| File | Change |
|------|--------|
| `package.json` | `linux.executableName`: `"novi"` → `"NoviEditor"`; `linux.desktop.StartupWMClass`: `"novi"` → `"NoviEditor"` |
| `src/main/main.ts` | Added `app.setName('NoviEditor')` before `app.setAppUserModelId()` |
| `build/after-install.sh` | Writes `/opt/Novi/novi` shell wrapper calling `NoviEditor --novi-cli`; `update-alternatives` now registers the wrapper (not the binary) |
| `build/after-remove.sh` | Fixed `update-alternatives --remove` path to `/opt/Novi/novi`; added `rm -f /opt/Novi/novi` to clean up wrapper on uninstall |

### Rationale
The binary rename frees the name `novi` for the CLI tool, avoiding a naming conflict between the GUI app and the command-line entry point. `productName` stays `"Novi"` so install paths (`/opt/Novi/`, `Program Files\Novi\`) are unchanged.

### Test Results
- 638 tests passed, 0 failed (39 suites)

### Commit
TBD
