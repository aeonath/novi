# Ad hoc — Focus active pane when tab is switched or created — 20260213.2123

## Summary
When switching to a tab (by click or when a new tab is created), the active pane now receives focus so the user can type immediately without clicking into the editor, terminal, or Novi Shell. Focus is applied after the pane is visible using a double requestAnimationFrame. Novi Shell exposes a focus API so the app can focus it when its tab is active.

## Reason
User reported: when the editor tab has focus and they type, nothing happens until they click on the editor. The active area (Monaco editor, terminal, or Novi Shell) was not receiving focus when a tab became active.

## Files Changed

### Created
- **nova/changelog/20260213/TIME_2123-CHANGELOG.md** — This file.

### Modified
- **src/renderer/components/App.tsx**
  - In `onTabSwitch`, after updating state and status bar, schedule focus with two `requestAnimationFrame` callbacks so it runs after the pane is visible. For `tab.type === 'file'` call `__monacoEditorAPI.focus()`; for `'terminal'` call `__terminalAPI[tab.id].focus()`; for `'novi-prompt'` call `__noviShellAPI[tab.id].focus()`.
- **src/renderer/components/NoviShell.tsx**
  - New `useEffect`: register `(window as any).__noviShellAPI[promptId] = { focus: () => terminalRef.current?.focus() }` so the app can focus this shell when its tab is active. Cleanup on unmount removes the entry.

## Implementation details
- TabBar's `addTab` and `switchTab` both invoke `onTabSwitch`, so focus runs when a new tab is created and when the user clicks a tab.
- Double rAF ensures the DOM has updated (pane `display: flex`) before calling focus.

## User-facing impact
- Typing in the editor, terminal, or Novi Shell works as soon as the tab is active; no need to click into the pane first.

## Git Commit Hash
`TBD` — Ad hoc: focus active pane on tab switch/create

## Status
✅ Completed
