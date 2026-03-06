# Changelog — 2026-03-06 00:25

## Fix vim mode breaking syntax highlighting (dual-Monaco instance)

### Summary
Syntax highlighting was completely broken when vim mode was active — all files rendered as plaintext with no colors. The root cause was a **dual-Monaco instance** problem: the vendored monaco-vim code imported from `monaco-editor/esm/vs/editor/editor.api`, causing esbuild to bundle a second copy of Monaco's editor API alongside the AMD-loaded global instance. The two instances had separate state (themes, languages, tokenization registries), causing conflicts.

### Root Cause
The vendored `src/renderer/vim/cm_adapter.ts` imported directly from Monaco's ESM internals:
```typescript
import { KeyCode, Range, ... editor } from "monaco-editor/esm/vs/editor/editor.api";
```
esbuild bundled these ESM modules into the IIFE output, creating a **second Monaco instance**. The vim adapter operated on the bundled ESM instance while the editor used the AMD-loaded global `window.monaco`. When vim mode initialized, the bundled Monaco's state setup interfered with the AMD Monaco's language registrations and tokenization.

Additionally, the retokenization code in EditorService had a race condition where the async TS worker callback could leave models stuck as `plaintext`.

### Implementation

#### Replaced vendored vim code with npm package
- Installed `monaco-vim@0.4.4` from npm
- Changed `import('../vim/index.js')` to `import('monaco-vim')` in MonacoEditor.ts

#### esbuild alias to eliminate dual-Monaco
- Created `src/renderer/shims/monaco-editor-api.ts` — re-exports `KeyCode`, `Range`, `Position`, `Selection`, `SelectionDirection`, `editor` from `window.monaco`
- Added esbuild `alias` in `scripts/build-renderer.js` mapping `monaco-editor/esm/vs/editor/editor.api` to the shim
- The `ShiftCommand` internal import (used for indent/dedent) is still bundled from ESM since it's a standalone utility class without state conflicts

#### Simplified retokenization
- Replaced fragile async TS worker + sync dual-path retokenization with simple `try/finally` pattern
- Guarantees model is never left stuck as `plaintext`

#### Removed unnecessary setTheme calls
- Removed `monaco.editor.setTheme()` from `initVim()` and `vimodeHandler` — theme is already set at editor creation and doesn't need re-application on vim toggle

### Files Changed
- **`src/renderer/components/MonacoEditor.ts`** — Use npm monaco-vim, remove setTheme from vim paths, clean up debug logging
- **`src/renderer/services/editor-service.ts`** — Simplified retokenization with try/finally, retokenize on switchToModel
- **`src/renderer/shims/monaco-editor-api.ts`** — NEW: Monaco global re-export shim
- **`scripts/build-renderer.js`** — Added esbuild alias for monaco-editor ESM
- **`package.json`** / **`package-lock.json`** — Added monaco-vim@0.4.4 dependency
- **`src/tests/core-0.4.0/editor-service.test.ts`** — Added getLanguageId/setModelLanguage to mocks

### Test Results
- 36 suites, 654 tests — all passing
- Build succeeds

### Commit Hash
TBD
