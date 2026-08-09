# Changelog — 2026-08-08 23:35

## Ad hoc: Fix installer freezing on "Launch Novi" at finish page

### Summary
User reported the NSIS installer becomes "Not Responding" after clicking
"Launch Novi" on the finish page, staying frozen for as long as Novi takes
to actually open.

Root cause: electron-builder's stock finish-page launch behavior
(`StartApp` in `app-builder-lib/templates/nsis/common.nsh`) always launches
via `StdUtils::ExecShellAsUser` — a plugin call that de-elevates the
launched process through Explorer via DCOM. That mechanism exists so that
an installer which required UAC elevation (e.g. writing to Program Files)
doesn't leave the launched app itself running with admin rights. It's
needed only when the installer process is actually elevated — but the
plugin call runs unconditionally regardless, and its DCOM broker round-trip
doesn't return until Novi's own (slow, Chromium-based) startup completes,
blocking the installer's single UI thread for that entire duration —
exactly the reported freeze.

This installer is per-user by design (`perMachine: false`, confirmed by
the build output; HKCU-only PATH registration, see `customInstall`'s own
comments) and in practice essentially never elevates, so every install was
paying that broker overhead for no reason.

Fix: added a `customFinishPage` override in `build/installer.nsh` —
electron-builder's documented extension point for replacing its default
finish page entirely (`!ifmacrodef customFinishPage` in
`assistedInstaller.nsh`). The replacement checks `UAC_IsAdmin`: if the
installer isn't elevated (the overwhelming majority of installs), it
launches Novi directly via a plain `Exec` call on the real `.exe` path
(near-instant, no DCOM/Explorer round-trip); only if the installer
genuinely is elevated does it fall back to the original
`StdUtils::ExecShellAsUser` de-elevation path, preserving correctness for
that edge case.

Verified by actually building the installer
(`npm run pack:win:installer`) — `makensis` compiled the new macro with no
errors, producing `Novi Setup 0.8.7.exe` with `perMachine=false` as
expected. Couldn't fully click through the GUI finish page in this
environment to time the launch directly, but the compile succeeding
confirms the macro syntax and referenced variables/macros (`UAC_IsAdmin`,
`APP_EXECUTABLE_FILENAME`, `isUpdated`, etc.) are all valid.

### Files Changed

| File | Change |
|------|--------|
| `build/installer.nsh` | Added `customFinishPage` macro overriding electron-builder's default `StartApp` finish-page launcher: uses plain `Exec` when not elevated (`UAC_IsAdmin` false), falls back to the original `StdUtils::ExecShellAsUser` de-elevation path only when elevated |

### Test Results
- 49 suites passed, 0 failed (744 tests — no Jest coverage touches NSIS scripts; verification here is the successful `makensis` compile)
- `npm run pack:win:installer`: full clean + build + package completed successfully, producing `dist\Novi Setup 0.8.7.exe`

### Commit
TBD
