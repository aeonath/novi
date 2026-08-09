# Changelog — 2026-08-09 13:59

## Ad hoc: Stop eager WSL probe from printing to the terminal on every launch

### Summary
User reported seeing `The Windows Subsystem for Linux is not installed...`
printed out even though Git Bash is the configured shell and WSL has never
been enabled in Options → Terminal.

Root cause: `SettingsTab` is instantiated and mounted (hidden via
`display:none`) at app startup in `App.mountChildComponents()`, and its
constructor immediately ran `loadSettings().then(() => this.render())`. Since
`activeSection` defaults to `'terminal'`, this called
`renderWindowsShellSettings()` on every launch — regardless of whether the
Settings panel was ever opened — which unconditionally invoked
`window.api.checkWslAvailable()`. That IPC handler (`main.ts`) shells out to
`C:\Windows\System32\wsl.exe --list --quiet` via `execFileSync`. On a machine
without WSL installed, that stub binary is known to write its "not
installed" banner directly to the attached console rather than to the
redirected/piped stdio `execFileSync` captures — so the message leaked into
the visible terminal even though the surrounding code caught the failure and
silently returned `false`.

Fix: the WSL availability probe is now gated behind actual visibility of the
Settings panel. `SettingsTab` no longer runs the check as part of its
constructor-time `loadSettings()`; instead `renderWindowsShellSettings()`
only fires it once, and only after a new `hasBeenShown` flag has been set.
That flag is set by a new `notifyShown()` method, which `App.ts` calls from
`updateContentVisibility()` at the exact moment the Settings tab actually
becomes visible (`display: flex`). Opening any other tab, or just running
the app, no longer touches `wsl.exe` at all.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/SettingsTab.ts` | Removed eager `checkWslAvailable()` call from `loadSettings()`; added `wslChecked`/`hasBeenShown` flags, a public `notifyShown()` method, and a lazy one-shot probe + re-render inside `renderWindowsShellSettings()` gated on `hasBeenShown` |
| `src/renderer/components/App.ts` | `updateContentVisibility()` now calls `this.settingsTab?.notifyShown()` at the moment the Settings container is actually switched to visible |

### Test Results
- 50 suites passed, 0 failed (754 tests, 0 new — existing `settings-tab.test.ts` coverage still passes unchanged)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
