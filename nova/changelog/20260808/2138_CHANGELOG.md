# Changelog — 2026-08-08 21:38

## Ad hoc: Gray out Undo on the editor tab until there's something to undo

### Summary
Follow-up to the Edit menu implementation (861d1f7). User clarified Undo
should get the same "grayed until available" treatment as Redo, not just
be unconditionally enabled on a file tab.

`MonacoEditor.ts` already exposed `canUndo()` from the previous change
(added alongside `canRedo()`, just not wired into the menu yet). Added the
matching `disabled` clause in `TitleBar.ts` — `item.command === 'undo' &&
isFileTab && !canUndo` — mirroring the existing Redo clause exactly.

### Files Changed

| File | Change |
|------|--------|
| `src/renderer/components/TitleBar.ts` | Added `canUndo` (live, via `window.__monacoEditorAPI.canUndo()`) and a matching `disabled` clause for the `undo` command, mirroring the existing `redo`/`canRedo` handling |
| `src/tests/core-0.8.0/titlebar-edit-menu.test.ts` | Updated to mock both `canUndo`/`canRedo` together; replaced the old "Redo tracks canRedo" tests with four covering all four combinations: both available, only redo available, only undo available (the "right after an undo" case), and neither available (`__monacoEditorAPI` missing) |

### Test Results
- 46 suites passed, 0 failed (713 tests)
- Manually confirmed 2 of the 6 titlebar-edit-menu tests fail when the new Undo `disabled` clause is removed, then pass again with the fix restored
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully

### Commit
TBD
