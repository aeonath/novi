# Sprint6 Task4 — Cleanup tasks — 20260212.2237

## Summary
Implemented all eight Sprint 6 Task 4 cleanup items: removed Novi Agile from menus; fixed set vimode response to appear on its own line; fixed prompt tag to novi> and tab label to ⚙ novi>; added system icon (⚙) to Novi Shell tab; removed open/save commands from Novi Shell; fixed set command help alignment; renamed Novi Prompt to Novi Shell (component, file, menu, UI); grayed out Command Palette menu option.

## Files Changed

### Removed
- **src/renderer/components/NoviPrompt.tsx** — Replaced by NoviShell.tsx.

### Added
- **src/renderer/components/NoviShell.tsx** — New component (renamed from NoviPrompt). NoviShellProps, NoviShell; welcome "Novi Shell v0.4.0"; set vimode response on own line (prompt written after async command completes); no open/save; help aligned; list shows ⚙ for novi-prompt tabs.

### Modified
- **src/main/menu.ts** — Removed "Novi Agile" menu item. Renamed "Novi Prompt" to "Novi Shell". Command Palette item: added `enabled: false`. Removed `novi-agile` from MenuCommand type.
- **src/renderer/components/TitleBar.tsx** — Removed Novi Agile from Novi menu. Renamed "Novi Prompt" to "Novi Shell". Command Palette: added `disabled: true`. MenuItem interface: added `disabled?: boolean`. renderMenuItem: gray out and no click when disabled.
- **src/renderer/components/App.tsx** — Import NoviShell from NoviShell.js; render <NoviShell>. Tab label for new/restored Novi Shell: `fileName: '⚙ novi>'`. Status messages: "Novi Shell ready" / "Failed to create Novi Shell". Welcome menu: "▶️ Novi Shell". Removed `novi-agile` case from handleCommand.
- **src/renderer/components/FileTree.tsx** — Context menu label "▶️ Novi Shell" (was "▶️ Novi Prompt").

## Technical Details

1. **Novi Agile removed** — Removed from main app menu (menu.ts) and from TitleBar dropdown (Novi section). Removed handler case in App.
2. **set vimode on own line** — handleInput (Enter): when command is non-empty, `executeCommand(terminal, command).then(() => { currentLineRef.current = ''; writePrompt(terminal); })` so the next `novi>` prompt is written after the async command (e.g. set vimode on/off) finishes.
3. **nova> → novi>** — writePrompt already wrote `novi>`; tab defaults in App were `nova>` and are now `⚙ novi>`.
4. **Tab icon** — New/restored Novi Shell tabs use `fileName: '⚙ novi>'`. List command in Novi Shell uses typeIcon `⚙` for `novi-prompt` tabs.
5. **Open/save removed** — Removed `open` and `save` from executeCommand switch; removed commandOpen and commandSave; removed from help text.
6. **Help alignment** — set line in commandHelp: `'  \x1b[33mset\x1b[0m          - '` (one more space so it aligns with version/list/clear/help).
7. **Rename to Novi Shell** — Component NoviPrompt → NoviShell, file NoviPrompt.tsx → NoviShell.tsx (old file deleted). Menu labels "Novi Prompt" → "Novi Shell". Welcome text "Novi Shell v0.4.0". Internal state/callback names (noviPromptTabs, onNoviPrompt, openNoviPrompts) kept for workspace compatibility.
8. **Command Palette grayed out** — menu.ts: Command Palette item `enabled: false`. TitleBar: Command Palette item `disabled: true` and renderMenuItem supports disabled (opacity 0.5, no click). Command palette is not implemented; option remains visible but disabled.

## Reason
Sprint 6 Task 4: Cleanup tasks per SPRINT6_PLAN.md.

## Test Results
- `npm run build`: success.
- `npm test`: 30 suites, 580 tests passed.

## Git Commit Hash
`7c797ea` — Sprint6 Task4 Cleanup

## Status
✅ Completed
