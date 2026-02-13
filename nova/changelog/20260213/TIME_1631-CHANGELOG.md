# Sprint 6 Task 8 — Implement the novi terminal command — 20260213.1631

## Summary
When on a terminal tab, commands that start with `novi` are intercepted and handled by the app instead of being sent to the shell. Implemented: `novi <file>` opens the file in the editor; `novi -s` displays current Novi Shell set options; `novi -c` opens or focuses the Novi Shell tab; `novi` with no arguments does nothing (reserved for future use).

## Requirements (from SPRINT6_PLAN)
- **novi myfile.py** — Intercept and open myfile.py in the Monaco editor.
- **novi -s** — Display the current Novi Shell set options (vimode, compat, singlefiletree).
- **novi -c** — Open the Novi Shell tab or switch focus to it if already open.
- **novi** (no args) — Do nothing; reserved for future operation.

## Files Changed

### Created
- **src/renderer/utils/novi-command.ts** — Pure parser for terminal lines: `parseNoviCommand(trimmed)` returns `{ handled, kind?: 'none'|'settings'|'shell'|'open', path? }`. Used by App to decide whether to handle the line and how.
- **src/tests/core-0.6.0/novi-command.test.ts** — Unit tests for `parseNoviCommand` (non-novi lines, `novi`, `novi -s`, `novi -c`, `novi <path>`).

### Modified
- **src/renderer/components/App.tsx**
  - Line buffering: terminal input is buffered per terminal until a line boundary (`\r` or `\n`). Only then is the line either handled as a novi command or sent to the PTY. Multiple lines in one chunk are processed in a loop.
  - Refs added for Task 8: `terminalLineBufferRef`, `terminalFileTreeRootsRef`, `noviPromptTabsRef`, `onNoviPromptRef` so `handleTerminalData` can read current state without changing callback identity.
  - `handleTerminalData` rewritten to: (1) append data to buffer; (2) on newline, parse with `parseNoviCommand`; (3) if `novi.handled`, run the appropriate action (none / settings / shell / open file) and send `\r\n` to PTY for a new prompt; (4) otherwise send the buffered line (including newline) to the PTY.
  - For **novi -s**: reads vimode, compat, singlefiletree via `window.api.getSetting`, formats like Novi Shell’s “set” output, and writes to the terminal via `__terminalAPI[terminalId].write`.
  - For **novi -c**: if a Novi Shell tab exists, switches to it via `setActiveTab` and `tabBarAPI.setActiveTab`; otherwise calls `onNoviPromptRef.current?.()` to open one.
  - For **novi &lt;path&gt;** (open file): resolves path against the terminal’s CWD (`terminalFileTreeRootsRef.current[terminalId].cwd`), supports absolute and relative paths; opens images in image tab and text files in Monaco (same flow as FileTree file open). Errors are written to the terminal in red.
  - `onNoviPromptRef` is kept in sync with `actionContext.onNoviPrompt` in the existing `__actionAPI` effect.

## Implementation details
- **Path resolution**: If the argument looks absolute (starts with `/`, `\`, or `Letter:`), it is used as-is; otherwise it is joined to the terminal CWD with the appropriate separator (`\` or `/` based on CWD).
- **Echo**: The user’s keystrokes are already displayed by xterm. For intercepted novi commands we do not send the line to the PTY; we only send `\r\n` so the shell prints a new prompt.
- **Tests**: 6 new tests in `novi-command.test.ts`; full test suite 31 suites, 590 tests, all passing.

## Git Commit Hash
`TBD` — Sprint6 Task8: Implement novi terminal command

## Status
✅ Completed
