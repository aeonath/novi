# Ad hoc — Novi terminal: inspect after Enter, add novi stub for transparency — 20260213.1649

## Summary
Terminal input is no longer buffered; all keystrokes (including Ctrl+C, Tab) are forwarded to the shell so bash behaves normally. After the user presses Enter we inspect the **first line of PTY output** (the echoed command) and, if it matches `novi ...`, we run the same handlers (open file, `novi -s`, `novi -c`). A **novi stub script** is installed in the app userData and prepended to PATH for new terminals so the shell runs `novi` successfully (exit 0) and does not print "command not found", making the feature transparent.

## Reason
User requested: (1) avoid breaking shell interaction (Ctrl+C, Tab, etc.) by waiting until Enter and then inspecting the command; (2) add a stub so the experience is transparent (no "command not found").

## Files Changed

### Created
- **src/main/novi-stub.ts** — Ensures a `novi` script exists under `userDataPath/novi-bin/novi` (contents `#!/bin/sh` + `exit 0`). Returns the `novi-bin` directory path for prepending to PATH. Uses `mkdirSync`/`writeFileSync`; idempotent.

### Modified
- **src/main/services/terminal-service.ts** — `createSession(cwd?, cols?, rows?, customId?, options?)` now accepts an optional fifth parameter `options?: { pathPrepend?: string }`. When `pathPrepend` is set, `env.PATH` is set to `pathPrepend + path.delimiter + process.env.PATH` so the stub directory is found first.
- **src/main/main.ts** — On `terminal-create`, calls `ensureNoviStubDir(app.getPath('userData'))`, then `terminalService.createSession(cwd, cols, rows, customId, { pathPrepend: stubDir })`.
- **src/renderer/components/App.tsx** — (Previous refactor in this session.) Removed input buffering, echo filter, and Tab special-case. All input is forwarded to the PTY; when input contains `\r` or `\n` we set `expectingCommandLineRef` and clear `commandLineBufferRef[terminalId]`. In the PTY output listener we accumulate data until a newline, parse the first line with `parseNoviCommand`, and if it’s a novi command we run the handler (settings, open file, focus Novi Shell). All PTY output is still written to the terminal.

## Implementation details
- Stub script is a single file `novi` with no extension; content is `#!/bin/sh\nexit 0\n`. Git Bash executes it via shebang. Directory is `{userData}/novi-bin`.
- PATH is prepended only for new terminal sessions; existing sessions are unchanged.
- Inspect-after-Enter logic is unchanged from the prior refactor: we only inspect the first line after we sent Enter; that line is the echoed command.

## User-facing impact
- Ctrl+C, Tab, and all other shell features work normally.
- Typing `novi myfile.py`, `novi -s`, or `novi -c` and pressing Enter still opens the file, shows settings, or focuses Novi Shell; the shell no longer prints "command not found" because the stub runs and exits 0.

## Git Commit Hash
`TBD` — Ad hoc: novi terminal inspect after Enter and stub for transparency

## Status
✅ Completed
