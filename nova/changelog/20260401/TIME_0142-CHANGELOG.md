# Changelog — Sprint 8 Task 4

**Date:** 2026-04-01 01:42  
**Commit:** TBD  
**Branch:** dev-core

## Summary

Removed the "home terminal" concept and changed default app behaviour: terminals are now regular closeable tabs, closing all tabs shows the home screen, and the home button navigates to the home screen instead of a pinned terminal.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/renderer/components/App.ts` | Modified | Core behaviour changes (see below) |
| `src/renderer/components/StatusBar.ts` | Modified | Updated home button tooltip text |

## Detailed Changes

### `src/renderer/components/App.ts`

- **Removed** `HOME_TERMINAL_ID` constant and `homeTerminalPinnedSet`
- **Removed** `pinnedTabIds` from TabBar config — all terminal tabs now show an X and are closeable
- **Changed** `onAllTabsClosed` callback: now shows the welcome/home screen (`showWelcome = true`) instead of switching to the home terminal
- **Changed** home button handler: now shows the welcome/home screen instead of switching to the home terminal
- **Changed** `recreateHomeTerminal()`: now restarts the first open terminal (for shell-change support in Settings) instead of a fixed home terminal ID
- **Removed** `restartDeadHomeTerminal()` — no longer needed
- **Removed** `showExitConfirmDialog()` and `hideExitConfirmDialog()` — terminal exit no longer triggers an app-quit prompt
- **Removed** `exitConfirmOverlay` field
- **Changed** terminal exit handler: all terminals (including the formerly-pinned one) now just close their tab when the PTY exits; no special handling
- **Changed** PWD handler: all terminals use the same 💻 icon (removed home-terminal-specific 🖥️ icon distinction)
- **Renamed** `createHomeTerminal()` → `createInitialTerminal()`: creates a regular terminal with a timestamped ID, no longer pinned
- **Changed** `loadWorkspace()`: only creates an initial terminal if there are NO saved terminals from the previous session; if saved terminals exist, restores them and focuses the first one
- **Changed** `saveWorkspace()`: saves ALL open terminals (previously filtered out the home terminal); removed `homeTerminalCwd` field
- **Changed** `resetWorkspace()`: closes ALL tabs (previously kept the home terminal), then shows the home screen
- **Removed** `onTabClose` guard that prevented the home terminal from being closed
- **Updated** welcome screen text: "Open a terminal or file to get started"

### `src/renderer/components/StatusBar.ts`

- Updated home button tooltip from "Go to Home terminal" to "Go to home screen"

## Rationale

Sprint 8 Task 4 required removing the concept of a mandatory pinned "home" terminal. The app now treats all terminals equally — any terminal can be closed, and closing all tabs brings up the home/welcome screen. The home button now navigates to the home screen rather than a specific terminal. An initial terminal is auto-created on startup only when there are no terminals from the previous session.

## Test Results

- 39 suites, 638 tests passed, 0 failed
- Build: clean (tsc + esbuild, no errors)
