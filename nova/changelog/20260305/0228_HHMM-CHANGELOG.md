# Changelog — 2026-03-05 02:28

## Sprint 7 Task 5: Disable Action Bar (preserved for future use)

### Summary
The Action Bar (Action HUD) is not part of the Terminal Development Environment initial feature set. Disabled all integration points but preserved the source code (`action-hud.ts`, `ActionHUD.tsx`, `actions.ts`) and tests (`action-hud.test.ts`) for potential future reuse.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/App.tsx` | Commented out `ActionHUD` import, `createDefaultActions` import, `actions` useMemo, `<ActionHUD>` rendering, and `action-hud` menu command handler — all with "disabled" comments |
| `src/renderer/components/TitleBar.tsx` | Commented out "Action HUD" menu item from View menu |
| `src/renderer/editor/monaco-editor.ts` | Replaced "Press Ctrl+K to open the Action HUD" with generic welcome text |

### Also included (ad hoc, uncommitted from earlier)

| File | Change |
|------|--------|
| `src/renderer/components/FileTree.tsx` | Changed Git button icon from `⎇` to `✚` (Heavy Greek Cross) |
| `src/renderer/components/App.tsx` | Renamed "Novi Editor" to "Novi Terminal Environment" (About popup, comments) |
| `src/renderer/components/NoviShell.tsx` | Renamed "Novi Editor" to "Novi Terminal Environment" (version command) |
| `src/renderer/components/TitleBar.tsx` | Renamed "Novi Editor" to "Novi Terminal Environment" (default title, logo alt) |
| `src/renderer/index.tsx` | Renamed "Novi Editor" to "Novi Terminal Environment" (comments, console log) |

### Rationale
The Action HUD was an editor-centric feature (command palette). With the shift to a terminal-first environment, it's not relevant for the initial release but may be useful later.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
