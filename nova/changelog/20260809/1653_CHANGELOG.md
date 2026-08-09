# Changelog — 2026-08-09 16:53

## Ad hoc: Installer no longer blocks/looks frozen when launching Novi after Finish

### Summary
User reported that clicking Finish with "Launch Novi" checked makes the
installer window appear frozen while it waits for Novi to open.

`build/installer.nsh` already had a `customFinishPage` override with
extensive prior comments explaining exactly this bug and a partial fix: the
stock electron-builder finish-page launcher always calls
`StdUtils::ExecShellAsUser`, a *blocking* call that de-elevates the launch
through a DCOM broker and doesn't return until the launched app finishes
starting — which visibly freezes the installer window for as long as Novi's
Electron/Chromium cold start takes. The existing fix only routed around that
blocking call for non-elevated installs (`Exec` instead, fire-and-forget).
But it left the *elevated* branch (`${UAC_IsAdmin}` true — e.g. any install
where the user picked a directory like Program Files, which requires
elevation) still calling the blocking `StdUtils.ExecShellAsUser`, so those
installs still froze.

### Fix
Both branches of `StartApp` (the finish-page run function) are now
fire-and-forget `Exec` calls. The elevated branch now de-elevates via
`Exec 'explorer.exe "$INSTDIR\NoviEditor.exe"'` — handing the launch off to
the already-running, non-elevated Explorer process achieves the same
de-elevation `StdUtils::ExecShellAsUser` was doing, but `Exec` never waits
for it to complete. The `--updated`/`$1` flag that was being threaded
through both branches was dropped — confirmed nothing in Novi's source
(`src/main`, `src/renderer`) reads an `--updated` CLI argument, so it was
dead weight, and dropping it sidesteps `explorer.exe`'s unreliable argument
passthrough.

### Files Changed

| File | Change |
|------|--------|
| `build/installer.nsh` | `customFinishPage`'s `StartApp` function: elevated branch now uses non-blocking `Exec 'explorer.exe "..."'` instead of blocking `${StdUtils.ExecShellAsUser}`; dropped the unused `--updated` flag from both branches; updated the macro's explanatory comment |

### Test Results
- 53 suites passed, 0 failed (785 tests — unaffected; this is an NSIS script outside the TypeScript/Jest build, no existing test harness covers installer scripts, and `packaging.test.ts` doesn't reference this file's contents)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully
- Not verified end-to-end (would require `npm run pack:win:installer` and running the resulting installer on Windows) — left for the user to confirm on their next build, per their stated preference to do in-app/installer verification themselves

### Commit
TBD
