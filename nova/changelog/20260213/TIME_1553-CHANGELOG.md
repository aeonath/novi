# Ad hoc — Terminal tab context menu "New Terminal" fix — 20260213.1553

## Summary
The right-click context menu item "New Terminal" on a terminal tab did nothing because the Terminal component was never given an `onNewTerminal` callback. App now passes it, and the Terminal props interface declares it.

## Files Changed

### Modified
- **src/renderer/components/App.tsx** — Where terminal tabs are rendered, pass `onNewTerminal={actionContext.onNewTerminal}` into each `<Terminal>` so the context menu "💻 New Terminal" invokes the same handler as the menu and FileTree.
- **src/renderer/components/Terminal.tsx** — Add `onNewTerminal?: () => void` to `TerminalProps` and to the component’s destructured props so the context menu callback is typed and received.

## Reason
User reported that the "New Terminal" item in the right-click context menu on the terminal tab does not work. The menu item called `onNewTerminal?.()` but App did not pass `onNewTerminal` to Terminal, so the call was a no-op.

## Git Commit Hash
`TBD` — Ad hoc: terminal tab context menu New Terminal fix

## Status
✅ Completed
