# New Terminal Context Menu — 20251121.1112

## Summary
Added "New Terminal" option with separator to all context menus.

## Files Changed
- src/renderer/components/Terminal.tsx — Added New Terminal to terminal context menu
- src/renderer/components/MonacoEditor.tsx — Added New Terminal to editor context menu
- src/renderer/components/NovaPrompt.tsx — Added New Terminal to Nova Prompt context menu

## Changes Made
Added "New Terminal" menu item with separator above it to:
1. Terminal right-click menu (after Copy/Paste)
2. Monaco Editor right-click menu (after Copy/Paste, before Quit)
3. Nova Prompt right-click menu (after Copy/Paste, before Clear Screen)

All menu items call `onNewTerminal?.()` which is already wired up to create new terminal tabs.

## Reason
User requested quick access to create new terminals from context menus.

## Git Commit Hash
`TBD` - New Terminal context menu

## Status
✅ Completed

