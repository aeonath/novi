# Ad hoc — Terminal: fix double display on Enter, fix Tab completion — 20260213.1642

## Summary
Two fixes for the integrated terminal when using novi-command line buffering (Sprint 6 Task 8): (1) Commands were drawn twice after Enter because we echoed input locally and the PTY also echoed the line back — we now filter that PTY echo so the line is only drawn once. (2) Tab showed blank spaces and completion did not work because Tab was buffered and never sent to the PTY — we now send Tab to the PTY immediately and add the next PTY output (completion text) to the line buffer so Enter runs the completed line when completion arrives in one chunk.

## Reason
User reported: “after hitting enter the command is rendered twice” and “tab complete doesn’t work it is blank spaces”.

## Files Changed

### Modified
- **src/renderer/components/App.tsx**
  - **PTY echo filter**: Added `ptyEchoFilterRef` (`{ terminalId, remaining }`). When we send a non-novi line to the PTY in `handleTerminalData`, we set `ptyEchoFilterRef.current = { terminalId, remaining: toSend }`. In the `terminalOnData` callback (PTY output → display), we match incoming data against `remaining` (chunked: consume prefix or strip exact prefix and pass through the rest), skip writing the matched part, and clear the ref when consumed. So the echoed line from the PTY is not drawn again.
  - **Tab handling**: If `data === '\t'`, we set `afterTabRef.current = terminalId`, call `terminalWrite(terminalId, '\t')`, and return (no local echo, no adding to line buffer). So the shell receives Tab and can run completion. In `terminalOnData`, when `afterTabRef.current === terminalId`, we append the received `data` to `terminalLineBufferRef.current[terminalId]` and clear `afterTabRef`. So the first chunk of PTY output after Tab (typically the completion) is added to the line buffer and still displayed; on Enter we send that completed line when completion came in one chunk.

## Implementation details
- Echo filter supports chunked PTY output: if we expect `"ls\r\n"` we correctly skip `"l"`, `"s"`, `"\r\n"` or a single `"ls\r\n"` and pass through any extra data (e.g. prompt) after the echo.
- Tab: only the first PTY output chunk after Tab is appended to the buffer; multi-chunk completions may only partially update the buffer.

## User-facing impact
- Commands appear once after Enter.
- Tab triggers real shell completion (no more blank spaces); when the shell sends completion in one chunk, the completed line is sent on Enter.

## Git Commit Hash
`TBD` — Ad hoc: terminal fix double display and tab completion

## Status
✅ Completed
