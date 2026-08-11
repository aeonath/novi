# Changelog — 2026-08-11 02:23

## Ad hoc: Bump version to 0.9.0

### Summary
Version bump per user request: `0.8.9` → `0.9.0`.

### Files Changed

| File | Change |
|------|--------|
| `package.json` | `"version": "0.8.9"` → `"0.9.0"` |
| `package-lock.json` | Both self-referencing `"version"` fields (root + `packages[""]`) → `"0.9.0"` |

### Test Results
- Not applicable — no code changes. `npm run build` (`tsc` + renderer `esbuild`
  bundle + asset copy) completed successfully to confirm the app still builds
  cleanly with the new version.

### Commit
TBD
