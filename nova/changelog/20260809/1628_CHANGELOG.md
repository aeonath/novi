# Changelog — 2026-08-09 16:28

## Ad hoc: Fix status bar showing "Linux Terminal" while actually running Git Bash on Windows

### Summary
User asked why the status bar said "Linux Terminal" when they were using Git
Bash on Windows. Root cause: `App.ts`'s `loadSettings()` fetched the
`shellType` setting with `window.api.getSetting<string>('shellType')` — no
default value. On a machine where the shell setting has never been
explicitly changed via Options → Terminal, that key was never written to
disk, so the call resolves to `undefined`. `shellTypeToLabel(undefined)`
then fell through to its `default:` case, which was hardcoded to `'Linux
Terminal'` — wrong on Windows, where `main.ts`'s own terminal-service default
is `gitbash` (`process.platform === 'win32' ? 'gitbash' : 'linux'`). So the
label and the actual running shell disagreed purely because the label lookup
didn't know the platform, while the shell selection logic did.

This is a display-only bug — the shell actually spawned was correct (Git
Bash) the whole time; only the status bar text was wrong.

### Fix
`loadSettings()` now fetches the platform first and computes the same
platform-appropriate default (`gitbash` on `win32`, `linux` elsewhere) that
`main.ts` already uses, and passes it as the second argument to
`getSetting('shellType', defaultShellType)` — matching the convention
already used for every other setting read in this method. `shellTypeToLabel`
now always receives a real value instead of `undefined`.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | `loadSettings()`: resolve `defaultShellType` from `getPlatform()` before reading the `shellType` setting, and pass it as the setting's default instead of leaving the fetch unqualified; `shellTypeToLabel`'s unreachable-in-practice `default:` case changed from `'Linux Terminal'` to `'Git Bash'` for consistency |

### Test Results
- 53 suites passed, 0 failed (785 tests — no new tests added; `App.ts` has no existing test harness, and building one from scratch for this two-line fix would be disproportionate scope)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
