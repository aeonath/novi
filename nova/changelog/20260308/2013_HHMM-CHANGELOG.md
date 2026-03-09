# Changelog — 20260308.2013

## Ad hoc: Generic extension loading system with Settings UI

### Problem
Novi had hardcoded Lyric language support baked into the main process. Extensions couldn't be loaded generically from `~/.novi/extensions/`. Additionally, the `convertTmToMonarch()` function created RegExp objects that don't survive Electron IPC serialization (structured clone turns RegExp into `{}`), meaning syntax highlighting was completely broken.

### Root Cause
1. Extension loading was Lyric-specific with hardcoded grammar in `main.ts`
2. `convertTmToMonarch()` ran in the main process and returned RegExp objects over IPC — these serialize to empty objects `{}` via structured clone, so the Monarch tokenizer received no usable regex patterns

### Fix
- **`src/core/extension-loader.ts`**: Fully rewritten as generic loader. Scans `~/.novi/extensions/` for VSCode-compatible language extensions. Now sends raw TextMate grammar JSON (IPC-safe plain objects) instead of pre-converted Monarch grammar with RegExp objects.
- **`src/core/tm-to-monarch.ts`** (NEW): Extracted `convertTmToMonarch()` and helpers into a pure module with no Node.js dependencies. Can be imported by both main process and renderer (esbuild bundles it for browser).
- **`src/main/main.ts`**: Removed ~150 lines of hardcoded Lyric Monarch grammar and old `load-lyric-extension` handler. Single clean `load-all-extensions` IPC handler.
- **`src/preload/preload.ts`**: Removed `loadLyricExtension` bridge, kept `loadAllExtensions`.
- **`src/renderer/components/MonacoEditor.ts`**: Imports `convertTmToMonarch` from `tm-to-monarch.js` and converts TM→Monarch on the renderer side where RegExp objects work natively.
- **`src/renderer/components/SettingsTab.ts`**: Added Extensions section showing loaded extension cards (name, version, description, language, file extensions, publisher).
- **`src/renderer/components/SettingsSidebar.ts`**: Added Extensions entry to sidebar navigation.
- **`src/types/global.d.ts`**: Added `loadAllExtensions` to Window.api type.

### Files Changed
- `src/core/extension-loader.ts` (rewritten)
- `src/core/tm-to-monarch.ts` (new)
- `src/main/main.ts`
- `src/preload/preload.ts`
- `src/renderer/components/MonacoEditor.ts`
- `src/renderer/components/SettingsTab.ts`
- `src/renderer/components/SettingsSidebar.ts`
- `src/types/global.d.ts`
- `src/tests/core-0.5.0/extension-loader.test.ts`
- `src/tests/core-0.8.0/settings-sidebar.test.ts`

### Test Results
- 39 suites, 638 tests — all passing
- Build compiles successfully

### Commit
TBD
