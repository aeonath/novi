# Changelog — 2026-08-09 16:48

## Ad hoc: Source the status bar shell label from terminalService directly, not a re-derived guess

### Summary
Follow-up to the 16:28 fix. User clarified that on their machine the actual
shell in effect is PowerShell (not Git Bash) — because `terminal-service.ts`
already has fallback logic: if Git Bash isn't found at its configured path
when a terminal is actually created, it falls back to PowerShell and
persists that choice. The 16:28 fix had the renderer independently
re-guess a platform-based default (`win32` → `gitbash`) for the case where
the `shellType` setting is unset, which could disagree with what
`terminalService` will actually do once a fallback occurs — the same class
of "two places computing the same thing and drifting apart" bug as the
original WSL and label issues earlier today.

### Fix
Added a `get-shell-type` IPC channel that returns
`terminalService.getShellType()` — the shell type the service is actually
configured with right now (already resolved, including any fallback that
already happened). The renderer's status bar label now asks for this
directly instead of reading the raw `shellType` setting and guessing a
default itself. This guarantees the label always agrees with whatever shell
is actually in effect, for every case: `gitbash` → "Git Bash", `powershell`
→ "PowerShell", `wsl` → "WSL", `cmd` → "cmd.exe", `linux` → "Linux
Terminal" — sourced from one authoritative place instead of two.

### Files Changed

| File | Change |
|------|--------|
| `src/main/main.ts` | Added `ipcMain.handle('get-shell-type', () => terminalService.getShellType())` |
| `src/preload/preload.ts` | Exposed `getShellType: () => ipcRenderer.invoke('get-shell-type')` |
| `src/types/global.d.ts` | Added `getShellType: () => Promise<string>` to the `window.api` type |
| `src/renderer/components/App.ts` | `loadSettings()` now calls `window.api.getShellType()` instead of reading the `shellType` setting with a guessed platform default; `shellLabel`'s initial field value changed from `'Linux Terminal'` to `'Git Bash'` so an IPC failure (caught by the surrounding try/catch, leaving the field at its default) also fails toward the Windows-correct label instead of the Linux one |

### Test Results
- 53 suites passed, 0 failed (785 tests — no new tests added; `terminalService.getShellType()` itself is already covered by `src/tests/core-0.4.0/terminal-service.test.ts`, and the new IPC handler is thin glue code, consistent with how other `ipcMain.handle` wiring in `main.ts` isn't separately unit tested)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
