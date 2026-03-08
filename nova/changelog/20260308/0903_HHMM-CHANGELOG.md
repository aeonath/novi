# Changelog — 20260308.0903

## Summary
Renamed the user config directory from `~/.nova` to `~/.novi` to match the app name. Renamed `workspacerc.json` to `workspacerc` (it's an RC file, not a JSON file). Added migration logic to automatically copy existing `~/.nova/workspacerc.json` to `~/.novi/workspacerc` on first run.

## Files Changed
- `src/main/services/workspace-service.ts` — Changed config dir to `.novi`, workspace file to `workspacerc`; added `migrateFromLegacy()` method; added `mkdirSync`/`copyFileSync` imports
- `src/main/services/command-stats-service.ts` — Changed config dir to `.novi`; updated comment
- `src/core/extension-loader.ts` — Changed extensions dir to `.novi/extensions`; updated comments
- `src/main/main.ts` — Changed extensions dir reference to `.novi`
- `src/main/services/file-tree-watcher.ts` — Changed ignored pattern from `/.nova/` to `/.novi/`
- `src/tests/core-0.4.0/workspace-service.test.ts` — Updated test expectations for `.novi` and `workspacerc`
- `src/tests/core-0.5.0/extension-loader.test.ts` — Updated test expectation for `.novi`

## Rationale
The app was renamed from Nova to Novi but the config directory still used the old name. The workspace RC file had a `.json` extension which is inconsistent with RC file conventions.

## Test Results
- Build: ✅ Passes
- Tests: 642 passed, 4 failed (pre-existing failures in extension-loader and installer tests)

## Commit Hash
TBD
