# Ad hoc — Terminal input echo so characters display as typed — 20260213.1636

## Summary
After Sprint 6 Task 8 (novi terminal command), terminal input was buffered by line before being sent to the PTY so we could intercept `novi` commands. That meant the PTY never received characters one-by-one and therefore never echoed them, so nothing appeared in the terminal until Enter was pressed. This change echoes each incoming chunk to the terminal display immediately so the user sees what they type while we still buffer for novi handling.

## Reason
User reported that terminal commands were not displayed as typed and only showed up after pressing Enter. Cause: line buffering for novi interception with no local echo.

## Files Changed

### Modified
- **src/renderer/components/App.tsx** — At the start of `handleTerminalData`, before appending to the line buffer, we now write the incoming `data` to the terminal display via `__terminalAPI[terminalId].write(data)`. So every keystroke is echoed to the xterm immediately. Buffering and novi logic are unchanged; on Enter we still either handle a novi command (and send only `\r\n` to the PTY) or send the full line to the PTY. The shell does not re-echo the line when it receives it in one chunk, so there is no double display.

## Implementation details
- Echo is done first, then buffer update, then (when the chunk contains a newline) line processing. No change to the conditions for novi handling or to what is sent to the PTY.
- Single source of display for the current line: our echo. The PTY only receives data on Enter (full line or `\r\n` for novi), so no duplicate echo from the shell.

## User-facing impact
Terminal input is visible character-by-character again while novi command interception (e.g. `novi myfile.py`, `novi -s`, `novi -c`) continues to work as before.

## Git Commit Hash
`TBD` — Ad hoc: terminal echo so input displays as typed

## Status
✅ Completed
