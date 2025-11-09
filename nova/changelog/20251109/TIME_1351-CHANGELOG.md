# Sprint5 Task2 — 20251109.1351

## Summary
Generalized syntax extension support to load multiple language extensions from `~/.nova/extensions/*`. Updated extension loader to scan all folders, filter by activation events (onLanguage:* only), and dynamically register all valid language extensions with Monaco Editor.

## Files Changed

### Modified Files

#### src/core/extension-loader.ts
- Updated `ExtensionLoadResult` interface to include statistics:
  - `loaded` - number of successfully loaded extensions
  - `discarded` - number of skipped extensions
  - `languages` - array of loaded language metadata
- Added `SingleExtensionResult` interface for individual extension loading
- Added `shouldLoadExtension()` function to filter extensions:
  - Validates language/grammar contributions exist
  - Filters by activationEvents (only `onLanguage:*` allowed)
  - Returns reason for discarding if not valid
- Added `loadSingleExtension()` function:
  - Loads extension manifest from directory
  - Validates language and grammar contributions
  - Returns success/failure with reason
- **Created `loadAllExtensions()` function** (main new feature):
  - Scans all folders under `~/.nova/extensions/`
  - Loads each extension's `package.json`
  - Filters by activationEvents (only onLanguage:*)
  - Validates grammar files exist
  - Returns list of valid extensions with metadata
  - Logs summary: `[Nova] Loaded N syntax extension(s), M discarded.`
- Kept `loadLyricExtension()` for backwards compatibility

#### src/main/main.ts
- Added import for `loadAllExtensions`
- Created `load-all-extensions` IPC handler:
  - Calls `loadAllExtensions()` from extension-loader
  - Creates simplified Monarch grammars for each language
  - Supports generic syntax highlighting for all extensions
  - Returns language metadata and grammars to renderer
- Kept `load-lyric-extension` handler for backwards compatibility

#### src/preload/preload.ts
- Added `loadAllExtensions` to exposed API
- Maps to `ipcRenderer.invoke('load-all-extensions')`
- Allows renderer to call generalized extension loader

#### src/renderer/components/MonacoEditor.tsx
- Updated Monaco initialization to use `loadAllExtensions()`:
  - Replaced single Lyric extension loading
  - Now registers all valid language extensions dynamically
  - Loops through returned languages and registers each
  - Sets up Monarch tokenizer for each language
  - Logs per-language registration: `[MonacoEditor] Registered language 'X' for extensions: .ext`
  - Logs overall summary: `[MonacoEditor] Loaded N syntax extension(s), M discarded.`

#### src/tests/core-0.5.0/extension-loader.test.ts
- Added import for `loadAllExtensions`
- **Created comprehensive test suite for `loadAllExtensions()`**:
  - Tests directory scanning
  - Tests empty directory handling
  - Tests count validation (loaded vs discarded)
  - Tests filtering by language contributions
  - Tests filtering by activationEvents
  - Tests log message format
  - Tests corrupted manifest handling
  - Tests grammar file validation
  - Tests language metadata structure
  - 10 new tests added (total: 427 tests, up from 417)

## Key Features Implemented

### 1. Multi-Extension Scanning
- Automatically scans `~/.nova/extensions/*`
- Processes all subdirectories
- No hardcoded extension names

### 2. Smart Filtering
- **activationEvents** filter:
  - Only loads extensions with `onLanguage:*` events
  - Discards extensions with other activation events (commands, keybindings, etc.)
  - Logs reason for discarding
- **Contribution** filter:
  - Only loads extensions with `languages` and `grammars` contributions
  - Discards extensions without syntax support

### 3. Error Handling
- Gracefully handles missing directories
- Handles corrupted JSON manifests
- Handles missing grammar files
- Logs detailed reasons for discarding extensions

### 4. Logging
- Per-extension logs: `[Nova] Skipping extension 'X': reason`
- Summary log: `[Nova] Loaded N syntax extension(s), M discarded.`
- Per-language registration in Monaco: `[MonacoEditor] Registered language 'X' for extensions: .ext`

### 5. Dynamic Registration
- Registers all valid languages with Monaco
- Creates generic Monarch tokenizers for each
- Supports comments (#, //), strings (" and '), numbers, operators
- Extensible for future TextMate grammar parsing

## Reason
Sprint 5 Task 2 requires generalizing syntax extension support beyond just Lyric. This implementation:
1. Scans all extensions in `~/.nova/extensions/*`
2. Filters by `activationEvents` (only `onLanguage:*`)
3. Discards non-language extensions (commands, themes, etc.)
4. Dynamically registers all valid language extensions
5. Provides comprehensive logging for debugging
6. Adds extensive unit tests (10 new tests)
7. Maintains backwards compatibility with `loadLyricExtension()`

## Technical Implementation Details

### Extension Discovery Flow
1. **Scan**: Read all directories in `~/.nova/extensions/`
2. **Load**: Read `package.json` from each directory
3. **Filter**: Check `activationEvents` for `onLanguage:*` only
4. **Validate**: Ensure language/grammar contributions exist
5. **Check**: Verify grammar file exists on disk
6. **Return**: List of valid extensions with metadata

### IPC Communication
- Main process: Loads extensions and creates Monarch grammars
- Renderer process: Receives language metadata and registers with Monaco
- Decouples file system access (main) from Monaco API (renderer)

### Test Coverage
- **Unit tests**: 427 total (10 new for Task 2)
- **Coverage areas**:
  - Directory scanning
  - Manifest parsing
  - ActivationEvents filtering
  - Error handling (bad JSON, missing files)
  - Language metadata validation
  - Logging verification

## Test Results
```
Test Suites: 21 passed, 21 total
Tests:       427 passed, 427 total
```
**All tests passing at 100%** ✅

## User-Facing Impact
- Nova can now load **any** VS Code-compatible language extension
- Users can add syntax support by dropping extensions in `~/.nova/extensions/`
- Extensions with non-language features (commands, themes) are automatically ignored
- Clear console logging shows what was loaded/discarded
- Lyric extension continues to work as before

## Backwards Compatibility
- `loadLyricExtension()` function still exists
- `load-lyric-extension` IPC handler still works
- Existing code can still call Lyric-specific loader if needed
- New code should use `loadAllExtensions()` for multi-extension support

## Git Commit Hash
`TBD` - Sprint5 Task2 Implementation

## Status
✅ Completed

## Next Steps (Future Enhancements)
- Add caching to avoid re-parsing extensions on every load
- Support TextMate grammar parsing for richer syntax highlighting
- Add UI to enable/disable individual extensions
- Support extension updates/reloading without restart
- Add extension marketplace/discovery features

