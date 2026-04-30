# Ad Hoc — Remove Novi Shell entirely

**Date**: 2026-04-29 21:55  
**Commit**: TBD

## What changed

Removed the Novi Shell (the `#novi -c` xterm.js REPL tab). All settings it
previously managed had already been migrated to the Settings UI in earlier
commits. The shell had no remaining purpose.

## Files removed

| File | Reason |
|------|--------|
| `src/renderer/components/NoviShell.ts` | The component itself |

## Files changed

| File | Change |
|------|--------|
| `src/renderer/components/App.ts` | Removed import, `noviPromptTabs`, `noviShellInstances`, `noviShellContainerEl`, `noviPromptPlaceholderEl`, `syncNoviShellInstances()`, `syncNoviShellActiveState()`, `onNoviPrompt` action, all `'novi-prompt'` tab-type references |
| `src/renderer/components/TabBar.ts` | Removed `'novi-prompt'` from `Tab` type; removed Copy/Paste/Close context menu (was only for novi-prompt tabs) |
| `src/renderer/components/TitleBar.ts` | Removed "Novi Shell" menu item; removed `'novi-prompt'` from font-size disable check |
| `src/renderer/components/FileTree.ts` | Removed `onNoviPrompt` config prop and "Novi Shell" context menu item |
| `src/renderer/components/actions.ts` | Removed `onNovaPrompt` from `ActionContext` interface |
| `src/main/menu.ts` | Removed `'novi-prompt'` from `MenuCommand` type; removed "Novi Shell" Electron menu item |
| `src/main/services/workspace-service.ts` | Removed `openNoviPrompts` from `WorkspaceState` interface, serialisation, and deserialisation |
| `src/types/global.d.ts` | Removed `openNoviPrompts` from `WorkspaceState`; removed `'novi-prompt'` from `activeTabType` |
| `src/renderer/index.ts` | Removed `'novi-prompt'` from focus-fallback condition |
| `src/tests/core-0.4.0/workspace-service.test.ts` | Removed `openNoviPrompts` from all test fixtures and assertions |

## Rationale

The Novi Shell's only purpose was to let users change settings via a REPL. All
settings (`vimode`, `singlefiletree`, `keeptabs`, `gitenabled`, `compat`) have
been migrated to the graphical Settings tab. Removing the dead component reduces
surface area and simplifies the tab type system.

## Test results

- Build: clean (0 TypeScript errors introduced)
- Tests: 653 pass, 1 pre-existing failure (`vimode-setting.test.ts` — unrelated,
  broken since the vimode setting was moved in a prior commit)
