# Changelog — 2026-08-08 23:20

## Ad hoc: Bump version to 0.8.7

### Summary
Bumped `package.json`/`package-lock.json` version from `0.8.6` to `0.8.7`,
covering tonight's changes (git-status coloring fixes, terminal exit-crash
fix, Edit/View/File menu enable-disable logic, Documentation/Report Issue
links, popup-menu removal, and the new Word Wrap/Column Break/Hard
Break/Show Ruler editor settings). No other file hardcodes the version —
`main.ts`'s `get-version` IPC handler reads `package.json` at runtime, so
the About dialog and everywhere else pick this up automatically.

### Files Changed

| File | Change |
|------|--------|
| `package.json` | `version`: `0.8.6` → `0.8.7` |
| `package-lock.json` | Both `version` fields (root + `packages[""]`) updated to match |

### Test Results
- 49 suites passed, 0 failed (744 tests — no test hardcodes the version string)
- `npm run build`: `tsc` + renderer `esbuild` bundle + asset copy all completed successfully (confirmed `novi@0.8.7` in the build output)

### Commit
TBD
