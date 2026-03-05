# Changelog — 2026-03-05 03:18

## Sprint 7 Task 8: Add `savestate on/off` setting

### Summary
Added a persistent `savestate` setting (default: on) that controls whether the environment state is saved and restored between app launches. When savestate is off, the app always starts fresh with the home terminal in the user's default directory (as determined by their shell/bashrc). When on, existing workspace restore behavior is preserved.

### Changes

| File | Change |
|------|--------|
| `src/renderer/components/NoviShell.tsx` | Added `savestate` to the settings whitelist, display list, single-setting getter, and setter. Default is `true` (on). |
| `src/renderer/components/App.tsx` | Gate workspace load: skip restoration when `savestate` is off (same path as `--clean` flag). Gate workspace save: skip saving when `savestate` is off. |

### Rationale
Users who always want a clean start (or whose `.bashrc` sets a specific working directory) can disable workspace persistence without needing to pass `--clean` every launch.

### Test Results
- **620 tests passed**, 0 failed
- Build compiles successfully

### Commit Hash
TBD
