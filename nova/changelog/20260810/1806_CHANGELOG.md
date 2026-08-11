# Changelog — 2026-08-10 18:06

## Ad hoc: Fix Ctrl+C not sending SIGINT in the terminal (e.g. can't break `tail -f`)

### Summary
User reported that Ctrl+C does nothing while SSH'd into a remote host and
running `tail -f /var/log/syslog` — the standard way to interrupt a running
command was completely dead.

Root cause: `Terminal.ts`'s `initDisplay()` attaches a custom xterm key
handler that yields any keystroke matching a Terminal+Editor shortcut (via
`isClaimedByAppShortcut()`) to the app's own handling instead of letting
xterm process it — this is what lets Ctrl+S act as XOFF and Ctrl+Z as SIGTSTP
(Save/Undo are Editor-only shortcuts, deliberately excluded from that
category) while still letting Ctrl+A trigger the app's Select All, etc.
`Copy` (`CmdOrCtrl+C`) is in that same Terminal+Editor category, so Ctrl+C
was *always* claimed and yielded to the Electron Copy menu accelerator
instead of reaching xterm. `Terminal.handleCopy()` only writes to the
clipboard `if (selection && ...)` — with nothing selected (the normal case
when interrupting a running command), it silently does nothing. Net effect:
Ctrl+C with no selection was swallowed entirely — neither copied anything
nor sent the interrupt byte to the shell.

### Fix
Every other terminal emulator (Windows Terminal, VS Code's integrated
terminal, etc.) makes Ctrl+C dual-purpose: copy the selection if one exists,
otherwise send the real interrupt. `Terminal.ts` now does the same:

- Added `isCopyAccelerator(e)`, matching only the (possibly user-remapped)
  Copy shortcut specifically, alongside the existing `isClaimedByAppShortcut(e)`.
- Added `shouldXtermHandleKey(e, hasSelection)`, the actual decision function
  now passed to `attachCustomKeyEventHandler`: it lets xterm handle the
  keystroke itself (so the real byte reaches the PTY/shell) when the pressed
  combo is the Copy accelerator **and** the terminal currently has no
  selection (`terminal.hasSelection()`); otherwise defers to the existing
  `isClaimedByAppShortcut()` check unchanged.
- `initDisplay()`'s `attachCustomKeyEventHandler` callback is now just
  `(e) => shouldXtermHandleKey(e, terminal.hasSelection())`.

`isClaimedByAppShortcut()` itself is untouched — its existing tests and
semantics ("is this combo claimed by *some* Terminal+Editor shortcut,
irrespective of runtime state") still hold; the selection-aware carve-out
lives one layer up, where the mounted terminal's selection state is actually
available.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/Terminal.ts` | Added `isCopyAccelerator()` and `shouldXtermHandleKey()`; `initDisplay()`'s custom key handler now calls the latter instead of inlining the Tab/shortcut checks |
| `src/tests/core-0.8.0/terminal-app-shortcuts.test.ts` | New `isCopyAccelerator` tests (3) and `shouldXtermHandleKey` tests (5) covering the Ctrl+C dual-purpose behavior and confirming Ctrl+A/Ctrl+S/Ctrl+Tab are unaffected by selection state |

### Test Results
- 57 suites passed, 0 failed (876 tests, up from 868 — 8 new tests added)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
