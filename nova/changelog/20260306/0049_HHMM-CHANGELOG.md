# Changelog — 2026-03-06 00:49

## Fix unsaved edits lost on tab switch

### Summary
When editing a file (especially in vim mode) without saving and switching tabs, the unsaved edits would disappear upon switching back. The root cause was that `onTabSwitch` called `loadFile()` which overwrites the Monaco model's content with the cached `tab.content` (the original disk content).

### Root Cause
In `App.ts`, `onTabSwitch` called `__monacoEditorAPI.loadFile(tab.filePath, tab.content)` for every file tab switch. `loadFile()` flows through `EditorService.getOrCreateModel()` which compares `model.getValue()` against the passed content and calls `model.setValue(content)` if they differ — destroying any unsaved edits. It also reset `savedContent` and `isDirtyFlag` to false.

### Implementation

#### Added `switchToFile` method on MonacoEditor
- Calls `EditorService.switchToModel()` directly, which only switches the active model and restores view state without overwriting content
- Saves/restores per-file `savedContent` baseline via a new `savedContentMap`
- Recalculates dirty state from model content vs saved baseline

#### Added `savedContentMap` for per-file dirty tracking
- `loadFile()` stores saved content in the map
- `markAsSaved()` updates the map
- `switchToFile()` saves current file's baseline before switching and restores the target file's baseline

#### Updated `onTabSwitch` in App.ts
- Tries `switchToFile()` first (preserves model content)
- Falls back to `loadFile()` only if the model doesn't exist yet

### Files Changed
- **`src/renderer/components/MonacoEditor.ts`** — Added `switchToFile()`, `savedContentMap`, exposed in API
- **`src/renderer/components/App.ts`** — `onTabSwitch` uses `switchToFile` before falling back to `loadFile`

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
