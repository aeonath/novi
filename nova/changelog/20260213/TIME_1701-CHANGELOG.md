# Ad hoc — Novi terminal: inspect-after-Enter, stub, prompt stripping — 20260213.1701

## Summary
Terminal input is forwarded to the PTY with no buffering (Ctrl+C, Tab, etc. work). We detect `novi` commands by tracking the current line from **all** PTY output and, on each newline, parsing that line for "novi ...". When the line includes the shell prompt (e.g. `user@host path novi README.md`), we extract the "novi" part before parsing so the editor tab opens. A **novi stub** script (and `novi.bat` on Windows) is created under app userData and prepended to PATH for new terminals (MSYS path on Windows, re-applied in PROMPT_COMMAND) so the shell runs `novi` successfully and the experience is transparent.

## Reason
- User requested: wait until Enter then inspect the command so shell interaction is not broken; make it transparent (no "command not found").
- Editor tab did not open: (1) we were only inspecting output after we sent Enter, but the command is echoed as the user types, so we now track the current line from all PTY output; (2) the captured line included the prompt, so we now extract the "novi" command from the line before parsing.

## Files Changed

### Created
- **src/main/novi-stub.ts** — `ensureNoviStubDir(userDataPath)`: creates `userDataPath/novi-bin/` and writes `novi` (#!/bin/sh, exit 0) and `novi.bat` (@echo off, exit /b 0). Returns the directory path for PATH.
- **nova/changelog/20260213/TIME_1701-CHANGELOG.md** — This file.

### Modified
- **src/renderer/components/App.tsx**
  - Removed `expectingCommandLineRef`; we no longer only inspect after sending Enter.
  - **Current-line tracking:** Append every PTY output chunk to `commandLineBufferRef[terminalId]`. When the buffer contains a newline, take the completed line (up to first \r|\n), then: **extract novi command** — if the line contains `"novi"`, set `line = line.slice(line.indexOf('novi')).trim()` and use it only if it equals `"novi"` or starts with `"novi "`; then call `parseNoviCommand(line)` and, if handled, run the same handlers (settings, open file, focus Novi Shell). Buffer is trimmed to the remainder after the newline. All PTY data is still written to the terminal.
  - `handleTerminalData`: forwards all input to the PTY with no buffering and no ref setting.
- **src/main/services/terminal-service.ts**
  - `createSession(..., options?: CreateSessionOptions)` with `pathPrepend?: string`. When set, prepend to PATH (and on Windows convert to MSYS Unix-style via `toMsysPath()`). Set `PROMPT_COMMAND` to `export PATH="<prepend>:$PATH"; echo "__NOVA_PWD__:$(pwd)"` so the stub dir stays first in PATH after login profile runs.
- **src/main/main.ts** — On `terminal-create`, call `ensureNoviStubDir(app.getPath('userData'))` and pass `{ pathPrepend: noviBinPath }` to `terminalService.createSession`.

## Implementation details
- **Prompt stripping:** The PTY line often looks like `Aeonath4@SONNET MINGW64 miranova.studio/ (main) novi README.md`. We find the first `"novi"` and use the substring from there only if it is `"novi"` or `"novi ..."`, so we parse `"novi README.md"` and open the file.
- **Stub:** Path is converted to Git Bash form (e.g. `/c/Users/.../novi-bin`) when prepending to PATH on Windows. PROMPT_COMMAND re-exports PATH each prompt so the stub is found even if the login profile overwrote PATH.

## User-facing impact
- `novi README.md` (or any file) in the terminal opens that file in an editor tab.
- `novi -s` / `novi -c` work; no "command not found"; shell behavior (Ctrl+C, Tab) unchanged.

## Git Commit Hash
`TBD` — Ad hoc: novi terminal inspect-after-Enter, stub, prompt stripping

## Status
✅ Completed
