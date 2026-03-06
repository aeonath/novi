# Changelog — 2026-03-05 22:49

## Fix reload not updating editor content (stale Monaco model)

### Summary
Clicking "Reload" on the external file change banner did not update the editor content. The root cause was that `EditorService.getOrCreateModel()` returned the existing Monaco model without updating its content when called with new content for an already-loaded file.

### Root Cause
`getOrCreateModel()` checked if a model already existed for a file path and returned it immediately without updating the model's content. When `loadFile()` was called with fresh disk content, the stale model was reused unchanged.

### Implementation

#### `src/renderer/services/editor-service.ts`
- Changed `getOrCreateModel()`: when a model already exists, compares the new content with the model's current value and calls `model.setValue(content)` if they differ

#### `src/tests/core-0.4.0/editor-service.test.ts`
- Updated mock `createModel` to include `setValue` method and track mutable content state

### Files Changed
- **`src/renderer/services/editor-service.ts`** — Update existing model content in getOrCreateModel
- **`src/tests/core-0.4.0/editor-service.test.ts`** — Add setValue to mock model

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
