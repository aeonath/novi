# Changelog — 20260308.1311

## Ad hoc: Fix log directory locations and test failures

### Summary
- Moved git-service and git-watcher log paths from `$HOME/logs/` (via `process.cwd()`) to `~/.novi/logs/` to match project conventions
- Made extension-loader create `~/.novi/extensions/` on startup if it doesn't exist instead of bailing early
- Fixed extension-loader test to skip gracefully when lyric-lang extension isn't installed
- Created `build/installer.nsh` NSIS custom script for killing running Novi instances before install/uninstall
- Deleted stray `$HOME/logs/` directory

### Files Changed
| File | Change |
|------|--------|
| `src/main/services/git-service.ts` | Log path → `~/.novi/logs/git.log` |
| `src/main/services/git-watcher.ts` | Log path → `~/.novi/logs/git-watcher.log` |
| `src/core/extension-loader.ts` | Create extensions dir if missing instead of early return |
| `src/tests/core-0.5.0/extension-loader.test.ts` | Skip lyric test when extension not installed |
| `build/installer.nsh` | New: NSIS custom script for running-app detection |

### Test Results
- 39 suites, 646 tests — **100% pass**

### Commit Hash
TBD
